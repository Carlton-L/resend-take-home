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

/** RFC 8552. An underscore label cannot collide with a hostname, so the name is ours to define. */
export const RECORD_LABEL = '_domainclaim-challenge';

export const RECORD_TYPE = 'TXT';

/**
 * Claims one account can create per window. Named in the security floor. Creating a claim costs
 * nothing but typing a name, so the floor on it is here rather than in a comment.
 */
export const CLAIM_LIMIT = { max: 25, windowSeconds: 60 * 60 } as const;

/**
 * Checks one account can run per window, counted per claim and across the account.
 *
 * The screen asks on its own cadence, so these sit above it rather than near it: one claim polling
 * for a full window spends about sixteen checks, and Check now is on top of that. A limit tight
 * enough to trip on ordinary use would make the product argue with itself.
 *
 * Named in the security floor. A check spends DNS queries against nameservers belonging to whoever
 * owns the name, so the ceiling is theirs rather than ours.
 */
export const CHECK_LIMITS = {
  perClaim: { max: 20, windowSeconds: 5 * 60 },
  perAccount: { max: 60, windowSeconds: 5 * 60 },
} as const;

/** Rows are counted inside the longest window, so nothing older than it is kept. */
export const CHECK_ATTEMPT_RETENTION_SECONDS = CHECK_LIMITS.perAccount.windowSeconds;

/** The claim entry screen. */
export const CLAIM_PATH = '/claim';

/**
 * The list of this account's claims.
 *
 * Named for what it holds rather than for the table behind it. `/claims` and `/claim/<id>` differ
 * by one character, which is a bad pair of URLs to have to tell apart while reading an address bar.
 */
export const DOMAINS_PATH = '/domains';

export const claimPath = (id: string): string => `${CLAIM_PATH}/${id}`;

/** Where the record screen asks for a check. One constant, so the route and its caller agree. */
export const claimCheckPath = (id: string): string => `/api/claims/${id}/check`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids are uuids, and Postgres refuses a malformed one with an error rather than an empty result.
 * Checked before any query so a typed URL is a 404 instead of a 500.
 */
export const isClaimId = (value: string): boolean => UUID.test(value);
