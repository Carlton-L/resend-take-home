// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Next 16 renamed the middleware file convention to `proxy`, and it always runs on the Node
 * runtime here. It runs before any rendering, on every request the matcher below covers.
 *
 * Its one job is refreshing the session. An access token expires, and a Server Component cannot
 * write cookies, so without this the refreshed token would be thrown away on every render and the
 * user would be signed out at random. Reading the user is what triggers the refresh; the response
 * carries the rewritten cookies back.
 *
 * This is not the authorization boundary. A matcher is a pattern and a page is the thing that
 * knows what it needs, so every protected page checks the session itself as well.
 */
export const proxy = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (written) => {
          for (const { name, value } of written) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of written) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();

  // Spike only: a signed-out request for a static detail screen goes to sign in.
  if (!data.user && request.nextUrl.pathname.startsWith('/spike/b/')) {
    const signIn = new URL('/signin', request.url);
    signIn.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return response;
};

export const config = {
  // Pages only. Static assets need no session, and the two route handlers that touch one build
  // their own client, so running here would add a round trip to every API call.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
