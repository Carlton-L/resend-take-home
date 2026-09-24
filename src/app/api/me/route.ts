// src/app/api/me/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import type { MeResponse } from '@/lib/claims/dto';
import { testNamespaceEnabled } from '@/lib/dns/testNames';

export const runtime = 'nodejs';

/**
 * Who is signed in. The screens ask for this instead of the layout reading the session, so pages
 * can stay static.
 *
 * No same-origin check. That guard is for requests that change something, and a browser does not
 * send Origin on a same-origin GET. Another site cannot read this response.
 */
export const GET = async (request: NextRequest) => {
  const { supabase, applyCookies } = supabaseRouteClient(request);
  const respond = (body: MeResponse, status: number) =>
    applyCookies(
      NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } }),
    );

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) {
    return respond({ ok: false, error: 'signed_out' }, 401);
  }
  return respond({ ok: true, email, testNamespace: testNamespaceEnabled() }, 200);
};
