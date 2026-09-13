// src/app/api/auth/confirm/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin, DEFAULT_SIGNED_IN_PATH, LINK_DEAD_PATH } from '@/lib/auth/config';
import { safeNextPath } from '@/lib/auth/nextPath';
import { confirmLinkSignatureValid } from '@/lib/auth/secrets';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';

export const runtime = 'nodejs';

/**
 * Redemption happens here, on POST, and never on GET.
 *
 * Email security scanners fetch every URL in an inbound message before the person sees it. A
 * single use link redeemed on GET is spent by the scanner, and the recipient gets an error for
 * doing nothing wrong. A scanner does not submit forms.
 *
 * 303 so the browser follows the redirect with a GET. A 302 after a POST leaves the method to the
 * browser, and some will repeat the POST.
 */
export const POST = async (request: NextRequest) => {
  const form = await request.formData().catch(() => null);
  const tokenHash = form?.get('token_hash');
  const email = form?.get('email');
  const signature = form?.get('sig');
  const next = form?.get('next');

  // Configuration, not the request. A forged Host header would otherwise decide where someone
  // lands after a successful sign in, and the emailed link is already built the same way.
  const origin = appOrigin();
  const dead = () => NextResponse.redirect(new URL(LINK_DEAD_PATH, origin), { status: 303 });

  if (typeof tokenHash !== 'string' || typeof email !== 'string' || typeof signature !== 'string') {
    return dead();
  }

  const destination = safeNextPath(typeof next === 'string' ? next : null);
  const arrive = new URL(destination ?? DEFAULT_SIGNED_IN_PATH, origin);

  // The same check the page made before displaying the address. Repeated here because the page and
  // this handler are separate requests, and nothing in between is trusted.
  if (!confirmLinkSignatureValid({ tokenHash, email, next: destination }, signature)) {
    return dead();
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (error || !data.user) {
    // A spent token in a browser that already holds a session for the same address is not a
    // failure. The person asked to sign in as someone and they are signed in as that someone, so
    // the honest answer is the page they were going to. An error here would be about the token
    // rather than about them.
    const { data: existing } = await supabase.auth.getUser();
    if (existing.user?.email?.toLowerCase() === email.toLowerCase()) {
      return applyCookies(NextResponse.redirect(arrive, { status: 303 }));
    }
    // Otherwise it is expired, already used, replaced by a newer link, or followed by a scanner.
    // Those are one screen, because the product cannot tell them apart from what Supabase returns.
    return dead();
  }

  // The session that came back has to belong to the address the page named. A mismatch should be
  // impossible given the signature, and it costs one comparison to be certain.
  if (data.user.email?.toLowerCase() !== email.toLowerCase()) {
    return dead();
  }

  return applyCookies(NextResponse.redirect(arrive, { status: 303 }));
};
