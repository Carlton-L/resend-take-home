// src/app/api/claims/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { CLAIM_PATH, claimPath } from '@/lib/claims/config';
import { type ClaimsResponse, type CreateResponse, toClaimDTO } from '@/lib/claims/dto';
import { type CreateOutcome, claimsForOwner, createClaim, heldByAnother } from '@/lib/claims/store';
import { demoTokenLifetimeMs, testNamespaceEnabled } from '@/lib/dns/testNames';
import { normalizeDomainInput } from '@/lib/domain/normalize';
import { isSameOrigin } from '@/lib/http/sameOrigin';
import { wantsJson } from '@/lib/http/wantsJson';

/** Reaches Postgres and reads the demo flag. Neither is available on Edge. */
export const runtime = 'nodejs';

/**
 * A relative Location, which is valid and avoids reconstructing an absolute origin behind a proxy.
 * 303 so the browser follows with GET and a reload does not repost the form.
 */
const seeOther = (path: string) =>
  new NextResponse(null, { status: 303, headers: { Location: path } });

const noStore = { 'cache-control': 'private, no-store' };

/** Every claim this account has, newest first. Reads only, so no same-origin check. */
export const GET = async (request: NextRequest) => {
  const { supabase, applyCookies } = supabaseRouteClient(request);
  const respond = (body: ClaimsResponse, status: number) =>
    applyCookies(NextResponse.json(body, { status, headers: noStore }));

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return respond({ ok: false, error: 'signed_out' }, 401);
  }

  try {
    const claims = await claimsForOwner(user.id);
    return respond({ ok: true, claims: claims.map(toClaimDTO) }, 200);
  } catch {
    return respond({ ok: false, error: 'unavailable' }, 503);
  }
};

/** The name from either a JSON body or the old form post. */
const submittedName = async (request: NextRequest, json: boolean): Promise<unknown> => {
  if (json) {
    const body: unknown = await request.json().catch(() => null);
    return typeof body === 'object' && body !== null && 'name' in body ? body.name : null;
  }
  const form = await request.formData().catch(() => null);
  return form?.get('name') ?? null;
};

/**
 * The JSON answer to a create. Whether another account holds the name is read here, so the screen
 * can say so on arrival instead of after the first check.
 */
const answerCreated = async (
  created: CreateOutcome,
  name: string,
  ownerId: string,
  answer: (body: CreateResponse, status: number) => NextResponse,
  refuse: (error: 'limited' | 'unavailable', status: number) => NextResponse,
): Promise<NextResponse> => {
  switch (created.outcome) {
    case 'created':
    case 'existing': {
      // A failed read here is not a failed create. The claim screen asks again when it loads.
      const held = await heldByAnother(name, ownerId).catch(() => false);
      return answer(
        {
          ok: true,
          id: created.id,
          outcome: created.outcome,
          reissued: created.outcome === 'existing' && created.reissued,
          heldByAnother: held,
        },
        created.outcome === 'created' ? 201 : 200,
      );
    }
    case 'limited':
      return refuse('limited', 429);
    case 'unavailable':
      return refuse('unavailable', 503);
    default: {
      const exhaustive: never = created;
      return exhaustive;
    }
  }
};

/**
 * Creates a claim.
 *
 * Two callers while the rebuild lands. The new screens send JSON and get JSON back. The old form
 * post still gets a 303, so claiming works on the old screens until they are removed.
 *
 * The name is normalized again here because the server decides what was claimed. Same function on
 * both sides, so the two cannot drift.
 *
 * Uses the route client rather than `signedInUser`. The proxy does not run on `/api`, so this is
 * the request that discovers an expired access token, and reading the user is what refreshes it.
 * Supabase rotates the refresh token when that happens, so the new cookies have to reach the
 * browser or the token it still holds is already spent and the next refresh signs the user out.
 */
export const POST = async (request: NextRequest) => {
  // Before anything reads a session, so a refused request costs nothing and writes nothing.
  if (!isSameOrigin(request)) {
    return new NextResponse('This request did not come from a page on this site.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const json = wantsJson(request);
  const { supabase, applyCookies } = supabaseRouteClient(request);
  // Every exit after this goes through one of these, so a refreshed session is never dropped.
  const respond = (path: string) => applyCookies(seeOther(path));
  const answer = (body: CreateResponse, status: number) =>
    applyCookies(NextResponse.json(body, { status, headers: noStore }));
  // The form, not wherever sign in lands. The claim screen is the only page that renders these.
  const refuse = (error: 'invalid' | 'limited' | 'unavailable', status: number) =>
    json ? answer({ ok: false, error }, status) : respond(`${CLAIM_PATH}?error=${error}`);

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return json
      ? answer({ ok: false, error: 'signed_out' }, 401)
      : respond(`${SIGN_IN_PATH}?next=${encodeURIComponent(CLAIM_PATH)}`);
  }

  const submitted = await submittedName(request, json);
  if (typeof submitted !== 'string') {
    return refuse('invalid', 400);
  }

  const normalized = normalizeDomainInput(submitted, {
    allowTestNamespace: testNamespaceEnabled(),
  });
  if (!normalized.ok) {
    return refuse('invalid', 400);
  }

  const demoLifetime = testNamespaceEnabled() ? demoTokenLifetimeMs(normalized.value.name) : null;
  const created = await createClaim({
    ownerId: user.id,
    name: normalized.value.name,
    registrableDomain: normalized.value.registrableDomain,
    ...(demoLifetime === null ? {} : { tokenLifetimeMs: demoLifetime }),
  });

  if (json) {
    return answerCreated(created, normalized.value.name, user.id, answer, refuse);
  }

  switch (created.outcome) {
    case 'created':
      return respond(claimPath(created.id));
    // Claiming a name this account already has goes to the claim it already has. The flag is what
    // lets the record screen say why the user did not get a new one.
    case 'existing':
      return respond(`${claimPath(created.id)}?${created.reissued ? 'reissued=1' : 'existing=1'}`);
    case 'limited':
      return refuse('limited', 429);
    case 'unavailable':
      return refuse('unavailable', 503);
    default: {
      const exhaustive: never = created;
      return exhaustive;
    }
  }
};
