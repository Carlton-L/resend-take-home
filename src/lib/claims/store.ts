// src/lib/claims/store.ts
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { CLAIM_LIMIT, TOKEN_TTL_MS } from '@/lib/claims/config';
import { isExpired } from '@/lib/claims/evaluate';
import type { ClaimStatus } from '@/lib/claims/state';
import { holdsTheName, OWNED_STATUSES } from '@/lib/claims/state';
import { generateToken } from '@/lib/claims/token';
import { getDb } from '@/lib/db/client';
import { claims } from '@/lib/db/schema';

export type Claim = {
  id: string;
  ownerId: string;
  name: string;
  registrableDomain: string;
  token: string;
  status: ClaimStatus;
  issuedAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
};

/** Postgres unique violation. Both indexes on `claims` are unique, so either can raise it. */
const UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === UNIQUE_VIOLATION;

/**
 * This account's live claim on this name, if it has one.
 *
 * A held row is preferred, then a pending one. Anything else, which today means `revoked`, is
 * ignored: a claim that has been given up should neither be handed back nor block a new one.
 *
 * Never falls back to whatever the database returned first. Without an order, a revoked row and a
 * pending row on the same name come back in an arbitrary order, and the user would sometimes be
 * sent to a dead claim.
 */
const ownClaimFor = async (ownerId: string, name: string): Promise<Claim | null> => {
  const rows = await getDb()
    .select()
    .from(claims)
    .where(and(eq(claims.ownerId, ownerId), eq(claims.name, name)));
  return (
    rows.find((row) => holdsTheName(row.status)) ??
    rows.find((row) => row.status === 'pending') ??
    null
  );
};

export type CreateOutcome =
  | { outcome: 'created'; id: string }
  /** The account already had a claim on this name. `reissued` when its token had expired. */
  | { outcome: 'existing'; id: string; reissued: boolean }
  | { outcome: 'limited' }
  | { outcome: 'unavailable' };

/**
 * Issues a token and writes the claim, or hands back the claim this account already has.
 *
 * Claiming a name twice used to mint a second token and leave the first claim unreachable, which
 * silently invalidated whatever record the user had already added. Going to the existing claim is
 * what the user meant by typing the name again.
 *
 * An expired pending claim is reissued in place rather than refused. The row keeps its id, so the
 * URL the user already has still works, and the record screen says the value has changed.
 *
 * A name another account holds is NOT refused here. Uniqueness covers the held states only, so a
 * challenger keeps a pending claim on it, which is what the transfer path is built on.
 *
 * The limit and the insert are one statement, because two concurrent requests would otherwise both
 * read a count under the limit and both insert.
 */
export const createClaim = async (input: {
  ownerId: string;
  name: string;
  registrableDomain: string;
  now?: Date;
}): Promise<CreateOutcome> => {
  const now = input.now ?? new Date();

  try {
    const existing = await ownClaimFor(input.ownerId, input.name);
    if (existing !== null) {
      if (existing.status === 'pending' && isExpired(existing, now)) {
        await reissueToken(existing.id, input.ownerId, now);
        return { outcome: 'existing', id: existing.id, reissued: true };
      }
      return { outcome: 'existing', id: existing.id, reissued: false };
    }

    const rows = await getDb().execute<{ id: string }>(sql`
      insert into claims (owner_id, name, registrable_domain, token, expires_at)
      select ${input.ownerId}::uuid, ${input.name}, ${input.registrableDomain},
             ${generateToken()}, ${new Date(now.getTime() + TOKEN_TTL_MS).toISOString()}::timestamptz
      where (
        select count(*) from claims
        where owner_id = ${input.ownerId}::uuid
          and issued_at > now() - make_interval(secs => ${CLAIM_LIMIT.windowSeconds})
      ) < ${CLAIM_LIMIT.max}
      returning id
    `);

    const id = rows[0]?.id;
    return id === undefined ? { outcome: 'limited' } : { outcome: 'created', id };
  } catch (error) {
    // Lost the race against another request from the same account for the same name. The index is
    // what makes that safe; this just reports what the winner created.
    if (isUniqueViolation(error)) {
      const raced = await ownClaimFor(input.ownerId, input.name).catch(() => null);
      if (raced !== null) {
        return { outcome: 'existing', id: raced.id, reissued: false };
      }
    }
    // Not logged. The statement and its parameters travel on the error.
    return { outcome: 'unavailable' };
  }
};

/**
 * A new token and a new window on the same row.
 *
 * Conditional on the row still being pending, so this cannot reset a claim that verified between
 * the read and the write.
 */
const reissueToken = async (id: string, ownerId: string, now: Date): Promise<void> => {
  await getDb()
    .update(claims)
    .set({
      token: generateToken(),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    })
    .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId), eq(claims.status, 'pending')));
};

/**
 * One claim, scoped to its owner in the query itself.
 *
 * Owner scoping is part of the lookup rather than a check afterwards, so a route cannot forget it
 * and a claim belonging to someone else is indistinguishable from one that does not exist.
 */
export const claimForOwner = async (id: string, ownerId: string): Promise<Claim | null> => {
  const rows = await getDb()
    .select()
    .from(claims)
    .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
};

/** One row of the domain list. The columns a row renders, and nothing else. */
export type ClaimSummary = {
  id: string;
  name: string;
  status: ClaimStatus;
  verifiedAt: Date | null;
  expiresAt: Date;
};

/**
 * Every claim this account holds, newest first.
 *
 * Owner scoping is in the where clause rather than a filter afterwards, same as `claimForOwner`,
 * so a row belonging to someone else cannot reach the page at all.
 *
 * Newest first because the case this screen was built for is a claim made a minute ago and then
 * navigated away from. The index on `(owner_id, issued_at)` already serves that order.
 *
 * Pending rows are included. A claim nobody has finished is the one most likely to be looked for.
 *
 * No limit. The list is every row the account has, which the claim limit caps at 25 an hour and
 * releasing removes. A limit without a page control would silently hide claims, which is the
 * failure this screen exists to fix.
 */
export const claimsForOwner = async (ownerId: string): Promise<ClaimSummary[]> =>
  getDb()
    .select({
      id: claims.id,
      name: claims.name,
      status: claims.status,
      verifiedAt: claims.verifiedAt,
      expiresAt: claims.expiresAt,
    })
    .from(claims)
    .where(eq(claims.ownerId, ownerId))
    .orderBy(desc(claims.issuedAt));

/**
 * Whether some other account currently holds this name.
 *
 * Read by the record screen so a challenger is told what they are walking into before they edit
 * their zone, rather than after a check comes back refused.
 */
export const heldByAnother = async (name: string, ownerId: string): Promise<boolean> => {
  const rows = await getDb()
    .select({ id: claims.id })
    .from(claims)
    .where(
      and(
        eq(claims.name, name),
        ne(claims.ownerId, ownerId),
        inArray(claims.status, [...OWNED_STATUSES]),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

export const deleteClaim = async (id: string, ownerId: string): Promise<boolean> => {
  const rows = await getDb()
    .delete(claims)
    .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId)))
    .returning({ id: claims.id });
  return rows.length > 0;
};

export type VerifyOutcome = 'verified' | 'held_by_another' | 'unavailable';

/**
 * Records that a check found the record.
 *
 * Conditional on the row still being pending, so it is idempotent: a reload runs the check again
 * and this write does nothing the second time.
 *
 * `held_by_another` is the owned-name index refusing. It means this account has proved control of
 * a name another account holds, which is the opening move of a transfer. Nothing here decides that,
 * so the claim stays pending and the screen says so.
 */
export const markVerified = async (
  id: string,
  ownerId: string,
  at: Date,
): Promise<VerifyOutcome> => {
  try {
    await getDb()
      .update(claims)
      .set({ status: 'verified', verifiedAt: at })
      .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId), eq(claims.status, 'pending')));
    return 'verified';
  } catch (error) {
    return isUniqueViolation(error) ? 'held_by_another' : 'unavailable';
  }
};
