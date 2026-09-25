// src/app/api/favicon/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { isClaimId } from '@/lib/claims/config';
import { claimForOwner } from '@/lib/claims/store';
import { fetchFavicon } from '@/lib/favicon/fetch';

export const runtime = 'nodejs';
export const maxDuration = 10;

/** Kept by the browser for a day. A site's icon rarely changes, and a miss costs a fetch. */
const FOUND = 'private, max-age=86400';
/** A site with no icon is asked again after an hour, in case it gets one. */
const MISSING = 'private, max-age=3600';

const missing = () =>
  new NextResponse(null, { status: 404, headers: { 'cache-control': MISSING } });

/**
 * The icon of a claimed name, for the list, the sidebar and the picker.
 *
 * Only names this account has claimed, so the route can't be used to fetch arbitrary sites. The
 * fetch itself refuses private addresses, follows at most two redirects, gives up after two
 * seconds a request, and passes on raster images only. A miss is a 404, which the screen shows as
 * the globe.
 */
export const GET = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  if (!isClaimId(id)) {
    return missing();
  }

  // Rotated session cookies ride on whatever this answers, as on every other route here.
  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return applyCookies(new NextResponse(null, { status: 401 }));
  }

  const claim = await claimForOwner(id, data.user.id);
  if (claim === null) {
    return applyCookies(missing());
  }

  const icon = await fetchFavicon(claim.name).catch(() => null);
  if (icon === null) {
    return applyCookies(missing());
  }

  return applyCookies(
    new NextResponse(new Uint8Array(icon.body), {
      headers: {
        'content-type': icon.contentType,
        'cache-control': FOUND,
        'x-content-type-options': 'nosniff',
        // Opened directly, it is an image and nothing else.
        'content-security-policy': "default-src 'none'; sandbox",
      },
    }),
  );
};
