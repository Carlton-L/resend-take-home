// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { gateFor } from '@/lib/auth/gate';

/**
 * Next 16 renamed the middleware file convention to `proxy`, and it always runs on the Node
 * runtime here. It runs before any rendering, on every request the matcher below covers.
 *
 * Two jobs. The first is refreshing the session. An access token expires, and a Server Component
 * cannot write cookies, so without this the refreshed token would be thrown away on every render
 * and the user would be signed out at random. Reading the user is what triggers the refresh; the
 * response carries the rewritten cookies back.
 *
 * The second is sending a request to the right page: signed out away from the app, signed in away
 * from sign in. That is for the person, not for security.
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

  const target = gateFor(request.nextUrl, data.user !== null);
  if (target === null) {
    return response;
  }

  // The redirect carries whatever the refresh wrote, so a rotated token is not dropped on the way.
  const redirect = NextResponse.redirect(new URL(target, request.url));
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
};

export const config = {
  // Pages only. Static assets need no session, and the two route handlers that touch one build
  // their own client, so running here would add a round trip to every API call.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
