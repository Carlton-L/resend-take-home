// src/app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin, DEFAULT_SIGNED_IN_PATH, LINK_DEAD_PATH } from '@/lib/auth/config';
import { safeNextPath } from '@/lib/auth/nextPath';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';

export const runtime = 'nodejs';

/**
 * Where GitHub sends the browser back, through Supabase, with a one time code. The code is
 * swapped for a session using the verifier cookie set when sign in started, so a code copied into
 * another browser is worth nothing.
 *
 * A failure lands on the same page as a dead email link. From here a refused code, a cancelled
 * consent screen and a stale tab look the same, and the next step for all of them is to start again.
 */
export const GET = async (request: NextRequest) => {
  const origin = appOrigin();
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const dead = () => NextResponse.redirect(new URL(LINK_DEAD_PATH, origin), { status: 303 });

  if (code === null) {
    return dead();
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return dead();
  }

  const destination = safeNextPath(params.get('next')) ?? DEFAULT_SIGNED_IN_PATH;
  return applyCookies(NextResponse.redirect(new URL(destination, origin), { status: 303 }));
};
