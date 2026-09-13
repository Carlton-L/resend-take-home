// src/app/api/signin/route.ts
import { z } from 'zod';
import { clientIpBucket } from '@/lib/auth/clientIp';
import { buildConfirmUrl } from '@/lib/auth/confirmUrl';
import { safeNextPath } from '@/lib/auth/nextPath';
import { recordSendAttempt } from '@/lib/auth/rateLimit';
import { supabaseAdminClient } from '@/lib/auth/supabase/admin';
import { sendMail } from '@/lib/email/send';
import { buildSignInEmail } from '@/lib/email/signInEmail';

/** Holds the secret key and reaches Postgres. Neither is available on Edge. */
export const runtime = 'nodejs';

const requestSchema = z.object({
  email: z.string().max(320),
  next: z.string().max(2048).nullish(),
});

/**
 * The response says the same thing whether or not that address has an account, and whether or not
 * anything was sent. Anything else turns this endpoint into a way to ask who has an account here.
 *
 * A refused send returns `sent` as well. The visible cooldown on the resend control is what tells
 * a real person to wait; a different response would tell an attacker which addresses are being
 * targeted often enough to matter.
 */
// A new Response each time. A body can only be read once, so one shared instance would be
// empty for every request after the first.
const sent = () => Response.json({ status: 'sent' });

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ status: 'invalid_email' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    return Response.json({ status: 'invalid_email' }, { status: 400 });
  }

  const next = safeNextPath(parsed.data.next);
  const decision = await recordSendAttempt(email, clientIpBucket(request.headers));

  if (decision.outcome === 'unavailable') {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
  if (decision.outcome === 'limited') {
    return sent();
  }

  const admin = supabaseAdminClient();

  // generateLink creates a user that does not exist, but the token it returns is then of type
  // signup rather than magiclink, and verifyOtp needs the matching one. Creating the account first
  // means the type is always magiclink, so the confirmation route has one code path and the type
  // never has to travel in the URL. Measured 2026-09-13, see spec.md.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== 'email_exists') {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }

  // From here the token is a credential in a URL. It is never logged, never returned in a body,
  // and goes nowhere except the message addressed to the person who asked for it.
  const url = buildConfirmUrl({ tokenHash, email, next });
  const message = buildSignInEmail(email, url);
  const outcome = await sendMail({ to: email, ...message });

  if (!outcome.sent) {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }

  return sent();
};
