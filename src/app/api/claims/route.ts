// src/app/api/claims/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { claimPath } from '@/lib/claims/config';
import { createClaim } from '@/lib/claims/store';
import { testNamespaceEnabled } from '@/lib/dns/testNames';
import { normalizeDomainInput } from '@/lib/domain/normalize';
import { isSameOrigin } from '@/lib/http/sameOrigin';

/** Reaches Postgres and reads the demo flag. Neither is available on Edge. */
export const runtime = 'nodejs';

/**
 * A relative Location, which is valid and avoids reconstructing an absolute origin behind a proxy.
 * 303 so the browser follows with GET and a reload does not repost the form.
 */
const seeOther = (path: string) =>
  new NextResponse(null, { status: 303, headers: { Location: path } });

/**
 * Creates a claim from the result card.
 *
 * A plain form post rather than a fetch, so claiming works with no client JavaScript. The name
 * arrives from a card the user has already read back, and is normalized again here because the
 * server decides what was claimed. Same function on both sides, so the two cannot drift.
 *
 * Uses the route client rather than `signedInUser`. The proxy does not run on `/api`, so this is
 * the request that discovers an expired access token, and reading the user is what refreshes it.
 * Supabase rotates the refresh token when that happens, so the new cookies have to reach the
 * browser or the token it still holds is already spent and the next refresh signs the user out.
 * The server client swallows its cookie writes by design, which is correct in a Server Component
 * and wrong here.
 */
export const POST = async (request: NextRequest) => {
  // Before anything reads a session, so a refused request costs nothing and writes nothing.
  if (!isSameOrigin(request)) {
    return new NextResponse('This request did not come from a page on this site.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  // Every exit after this point goes through here, so a refreshed session cannot be dropped.
  const respond = (path: string) => applyCookies(seeOther(path));
  const backToForm = (error: string) => respond(`${DEFAULT_SIGNED_IN_PATH}?error=${error}`);

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return respond(`${SIGN_IN_PATH}?next=${encodeURIComponent(DEFAULT_SIGNED_IN_PATH)}`);
  }

  const form = await request.formData().catch(() => null);
  const submitted = form?.get('name');
  if (typeof submitted !== 'string') {
    return backToForm('invalid');
  }

  const normalized = normalizeDomainInput(submitted, {
    allowTestNamespace: testNamespaceEnabled(),
  });
  if (!normalized.ok) {
    return backToForm('invalid');
  }

  const created = await createClaim({
    ownerId: user.id,
    name: normalized.value.name,
    registrableDomain: normalized.value.registrableDomain,
  });

  switch (created.outcome) {
    case 'created':
      return respond(claimPath(created.id));
    // Claiming a name this account already has goes to the claim it already has. The flag is what
    // lets the record screen say why the user did not get a new one.
    case 'existing':
      return respond(`${claimPath(created.id)}?${created.reissued ? 'reissued=1' : 'existing=1'}`);
    case 'limited':
      return backToForm('limited');
    case 'unavailable':
      return backToForm('unavailable');
    default: {
      const exhaustive: never = created;
      return exhaustive;
    }
  }
};
