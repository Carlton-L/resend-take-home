// src/app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin, DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { safeNextPath } from '@/lib/auth/nextPath';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';

export const runtime = 'nodejs';

/**
 * Where GitHub sends the browser back, through Supabase, with a one time code. The code is
 * swapped for a session using the verifier cookie set when sign in started, so a code copied into
 * another browser is worth nothing.
 *
 * A failure goes back to sign in with a note. From here a refused code, a cancelled consent screen
 * and a stale tab look the same, and the next step for all of them is to start again.
 */
export const GET = async (request: NextRequest) => {
  const origin = appOrigin();
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const next = safeNextPath(params.get('next'));
  const failed = () => {
    const back = new URL(SIGN_IN_PATH, origin);
    back.searchParams.set('error', 'oauth');
    if (next !== null) {
      back.searchParams.set('next', next);
    }
    return NextResponse.redirect(back, { status: 303 });
  };

  if (code === null) {
    return failed();
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return failed();
  }

  const destination = next ?? DEFAULT_SIGNED_IN_PATH;
  return applyCookies(NextResponse.redirect(new URL(destination, origin), { status: 303 }));
};
