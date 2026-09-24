// src/app/api/claims/[id]/check/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { runCheck } from '@/lib/claims/check';
import { isClaimId } from '@/lib/claims/config';
import { toClaimDTO } from '@/lib/claims/dto';
import { recordCheckAttempt } from '@/lib/claims/rateLimit';
import { claimForOwner } from '@/lib/claims/store';
import { type CheckEvent, EARLY_STEPS, earlySteps, encodeEvent } from '@/lib/claims/stream';
import { type CheckResponse, checkView } from '@/lib/claims/view';
import { isSameOrigin } from '@/lib/http/sameOrigin';

/** Queries DNS and reaches Postgres. Neither is available on Edge. */
export const runtime = 'nodejs';

/**
 * The bound on one check, as a decision rather than a default.
 *
 * The worst case is the two second deadline on every step the trace reaches, which for a four
 * label name is five steps, plus a second each for the two probes that only run after a failure.
 * Twelve seconds of DNS, and a database round trip either side of it. Twenty leaves room for the
 * slowest of those without letting a hung invocation sit there.
 *
 * Below the worst case, a slow zone would return a platform error instead of our own message,
 * which is the opposite of the point of this screen.
 */
export const maxDuration = 20;

const json = (body: CheckResponse, status: number) => NextResponse.json(body, { status });

/**
 * Runs one check of one claim and streams it, one JSON object per line.
 *
 * Steps 01 and 02 go out when DNS has answered. Steps 03 to 05 go out after the second look and the
 * write, because either can change them. `done` carries the whole answer and the claim as it now
 * stands, and the screen takes that as the truth.
 *
 * Every refusal (origin, session, not found, the check limit) answers plain JSON before a stream
 * starts, so the client reads the status code first and only then the body.
 *
 * POST because it writes: a claim that proves itself here is marked verified, and the attempt is
 * counted whether or not it proves anything.
 *
 * The route client rather than `signedInUser`, for the same reason as the other two endpoints. The
 * proxy does not run on `/api`, so this request is where an expired access token is discovered,
 * and the rotated cookies have to reach the browser.
 */
export const POST = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!isSameOrigin(request)) {
    return new NextResponse('This request did not come from a page on this site.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const respond = (body: CheckResponse, status: number) => applyCookies(json(body, status));

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return respond({ ok: false, error: 'signed_out' }, 401);
  }

  // Before the query, because Postgres refuses a malformed uuid with an error rather than an empty
  // result, and a typed URL should not be a 500.
  const { id } = await context.params;
  if (!isClaimId(id)) {
    return respond({ ok: false, error: 'not_found' }, 404);
  }

  // Scoped to the owner in the statement, so a claim belonging to someone else answers exactly as
  // one that does not exist. This is also the only way in to the resolver.
  const claim = await claimForOwner(id, user.id);
  if (claim === null) {
    return respond({ ok: false, error: 'not_found' }, 404);
  }

  // After the claim is known and before any query is sent, so a refused check costs one statement
  // and no DNS.
  const decision = await recordCheckAttempt(user.id, claim.id);
  if (decision.outcome !== 'allowed') {
    // Both refusals are answers the screen has a message for, so the code and the body say the
    // same thing rather than the client inferring one from the other.
    return respond(
      { ok: false, error: decision.outcome },
      decision.outcome === 'limited' ? 429 : 503,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const send = (event: CheckEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));
      let sent = 0;
      try {
        const now = new Date();
        const outcome = await runCheck(claim, now, {
          onTraced: (check) => {
            earlySteps(claim, check, now).forEach((step, index) => {
              send({ type: 'step', index, step });
            });
            sent = EARLY_STEPS;
          },
        });
        const view = checkView(outcome);
        // An expired claim asks DNS nothing, so its early steps were never sent.
        view.steps.slice(sent).forEach((step, offset) => {
          send({ type: 'step', index: sent + offset, step });
        });
        // The row as the check left it, with when it ran and who serves the zone.
        const fresh = await claimForOwner(claim.id, user.id).catch(() => null);
        send({ type: 'done', view, claim: fresh === null ? null : toClaimDTO(fresh) });
      } catch {
        send({ type: 'error', error: 'unavailable' });
      } finally {
        controller.close();
      }
    },
  });

  return applyCookies(
    new NextResponse(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
      },
    }),
  );
};
