// src/app/api/auth/oauth/[provider]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { appOrigin, SIGN_IN_PATH } from '@/lib/auth/config';
import { isOAuthProvider, oauthCallbackUrl } from '@/lib/auth/oauth';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';

export const runtime = 'nodejs';

/**
 * Starts sign in with GitHub. A plain link, so it works before any script has loaded.
 *
 * Supabase writes the PKCE verifier as a cookie here and reads it back on the callback. Asking it
 * not to redirect lets that cookie ride on our own 303, the same way every other auth route here
 * carries its cookies.
 */
export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) => {
  const { provider } = await context.params;
  const origin = appOrigin();
  const back = (error: string) =>
    NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=${error}`, origin), { status: 303 });

  if (!isOAuthProvider(provider)) {
    return back('provider');
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthCallbackUrl(origin, request.nextUrl.searchParams.get('next')),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return back('oauth');
  }

  return applyCookies(NextResponse.redirect(data.url, { status: 303 }));
};
