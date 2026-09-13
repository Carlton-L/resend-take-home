// src/lib/claims/config.ts

/**
 * How long a token is good for.
 *
 * Long enough to cover a weekend and the case where someone else holds the registrar login. A
 * pending claim reserves no name, since uniqueness covers only the owned states, so a long window
 * costs nothing but a stale token sitting in a zone. `token_expired` is reachable through the
 * `.test` namespace, so the real number does not have to be short to be demonstrated.
 *
 * User-facing: it goes into the record value and is stated on the record screen.
 */
export const TOKEN_TTL_DAYS = 7;

export const TOKEN_TTL_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * The TTL we suggest.
 *
 * It does not affect the answer that decides. The TXT query goes straight to authoritative
 * nameservers and those do not cache, so a corrected value is visible to the next check whatever
 * the TTL says. The window when the record is absent comes from the zone's SOA minimum, not from
 * this. What this number does decide is how long a corrected value takes to agree in public
 * resolvers, which is the `value_mismatch` case and nowhere else.
 */
export const SUGGESTED_TTL_SECONDS = 300;

/** RFC 8552. An underscore label cannot collide with a hostname, so the name is ours to define. */
export const RECORD_LABEL = '_domainclaim-challenge';

export const RECORD_TYPE = 'TXT';

/**
 * Claims one account can create per window. Named in the security floor. Creating a claim costs
 * nothing but typing a name, so the floor on it is here rather than in a comment.
 */
export const CLAIM_LIMIT = { max: 25, windowSeconds: 60 * 60 } as const;

/** Where the claim list will live. One place to change when the list exists. */
export const claimPath = (id: string): string => `/claim/${id}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids are uuids, and Postgres refuses a malformed one with an error rather than an empty result.
 * Checked before any query so a typed URL is a 404 instead of a 500.
 */
export const isClaimId = (value: string): boolean => UUID.test(value);
