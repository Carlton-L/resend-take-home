// src/app/api/signout/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin } from '@/lib/auth/config';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { isSameOrigin } from '@/lib/http/sameOrigin';

export const runtime = 'nodejs';

/**
 * POST rather than a link, so a prefetch or an image pointing here cannot sign someone out.
 */
export const POST = async (request: NextRequest) => {
  // Same guard as every other state-changing route, so a form on another site cannot sign
  // someone out either.
  if (!isSameOrigin(request)) {
    return new NextResponse('This request did not come from a page on this site.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  await supabase.auth.signOut();
  return applyCookies(NextResponse.redirect(new URL('/', appOrigin()), { status: 303 }));
};
