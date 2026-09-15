// src/app/api/claims/[id]/check/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { runCheck } from '@/lib/claims/check';
import { isClaimId } from '@/lib/claims/config';
import { recordCheckAttempt } from '@/lib/claims/rateLimit';
import { claimForOwner } from '@/lib/claims/store';
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
 * Runs one check of one claim and answers with what the screen renders.
 *
 * POST because it writes: a claim that proves itself here is marked verified, and the attempt is
 * counted whether or not it proves anything.
 *
 * The check used to run in the page body, which is why it could not be limited and why the domain
 * list could not prefetch a row. Both follow from it being a request of its own: the limit has an
 * ordinary place to sit, and a prefetched record screen now costs a render and nothing else.
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

  const outcome = await runCheck(claim);
  return respond({ ok: true, view: checkView(outcome) }, 200);
};
