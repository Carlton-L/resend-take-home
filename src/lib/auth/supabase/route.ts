// src/lib/auth/supabase/route.ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

type PendingCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

/**
 * A Supabase client for a route handler that answers with a redirect.
 *
 * Signing in and signing out both write cookies and then send the browser somewhere, and the
 * destination is only known after the call that writes them. So the writes are collected here and
 * applied to whichever response the handler ends up building, rather than relying on cookies
 * written through `next/headers` being merged into a response the handler constructed itself.
 */
export const supabaseRouteClient = (request: NextRequest) => {
  const pending: PendingCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (written) => {
          for (const cookie of written) {
            pending.push({
              name: cookie.name,
              value: cookie.value,
              options: (cookie.options ?? {}) as Record<string, unknown>,
            });
          }
        },
      },
    },
  );

  const applyCookies = <T extends NextResponse>(response: T): T => {
    for (const { name, value, options } of pending) {
      response.cookies.set({ name, value, ...options });
    }
    return response;
  };

  return { supabase, applyCookies };
};
