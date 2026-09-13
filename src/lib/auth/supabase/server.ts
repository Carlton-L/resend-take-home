// src/lib/auth/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

const url = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  return value;
};

const publishableKey = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
  }
  return value;
};

/**
 * A client for one server render or one route handler, never shared between requests, because the
 * session it holds belongs to whoever made the request.
 *
 * `getAll` and `setAll` both have to be here for a refreshed token to be written back. A Server
 * Component cannot write cookies, so the write throws there and is swallowed: the proxy has
 * already refreshed the session for that request, so nothing is lost.
 */
export const supabaseServerClient = async () => {
  const store = await cookies();
  return createServerClient(url(), publishableKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (written) => {
        try {
          for (const { name, value, options } of written) {
            store.set(name, value, options);
          }
        } catch {
          // Server Component render. Read only by design.
        }
      },
    },
  });
};

/**
 * The signed in address, or null. Used by the layout header and by the protected pages.
 *
 * Cached for the length of one render, because the layout and the page both need it and each call
 * is a round trip to Supabase. The proxy makes its own call before rendering starts and cannot
 * share this one.
 */
export const signedInEmail = cache(async (): Promise<string | null> => {
  const supabase = await supabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
});
