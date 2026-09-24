// src/app/api/claims/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { isClaimId } from '@/lib/claims/config';
import { type ClaimResponse, toClaimDetailDTO } from '@/lib/claims/dto';
import { claimForOwner, heldByAnother } from '@/lib/claims/store';

/** Reaches Postgres, which is not available on Edge. */
export const runtime = 'nodejs';

/**
 * One claim, with the record to add. Reads only: the check is its own POST, so opening a claim or
 * prefetching one never sends a DNS query.
 */
export const GET = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { supabase, applyCookies } = supabaseRouteClient(request);
  const respond = (body: ClaimResponse, status: number) =>
    applyCookies(
      NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } }),
    );

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

  try {
    // Scoped to the owner in the statement, so someone else's claim answers like a missing one.
    const claim = await claimForOwner(id, user.id);
    if (claim === null) {
      return respond({ ok: false, error: 'not_found' }, 404);
    }
    const held = await heldByAnother(claim.name, user.id);
    return respond({ ok: true, claim: toClaimDetailDTO(claim, held) }, 200);
  } catch {
    return respond({ ok: false, error: 'unavailable' }, 503);
  }
};
