// src/app/api/claims/[id]/release/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { isClaimId } from '@/lib/claims/config';
import type { ReleaseResponse } from '@/lib/claims/dto';
import { deleteClaim } from '@/lib/claims/store';
import { isSameOrigin } from '@/lib/http/sameOrigin';

export const runtime = 'nodejs';

/**
 * Releases a claim.
 *
 * `params` is a Promise in this version of Next, so a route that reads a path segment has to await
 * it before the segment is available.
 *
 * The route client, for the same reason as the claim endpoint: the proxy does not run on `/api`,
 * so reading the user here can refresh the session and rotate the refresh token, and those cookies
 * have to reach the browser.
 */
export const POST = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  if (!isSameOrigin(request)) {
    return new NextResponse('This request did not come from a page on this site.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const answer = (body: ReleaseResponse, status: number) =>
    applyCookies(NextResponse.json(body, { status }));

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return answer({ ok: false, error: 'signed_out' }, 401);
  }

  // Checked before the query, because Postgres refuses a malformed uuid with an error rather than
  // an empty result, and a typed URL should not be a 500.
  const { id } = await context.params;
  if (isClaimId(id)) {
    // Scoped to the owner in the statement, so a claim belonging to someone else deletes nothing
    // and answers exactly as one that does not exist.
    await deleteClaim(id, user.id);
  }

  // Releasing a claim that is already gone answers the same, so a double click is harmless.
  return answer({ ok: true }, 200);
};
