// src/app/api/signout/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin } from '@/lib/auth/config';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';

export const runtime = 'nodejs';

/**
 * POST rather than a link, so a prefetch or an image pointing here cannot sign someone out.
 */
export const POST = async (request: NextRequest) => {
  const { supabase, applyCookies } = supabaseRouteClient(request);
  await supabase.auth.signOut();
  return applyCookies(NextResponse.redirect(new URL('/', appOrigin()), { status: 303 }));
};
