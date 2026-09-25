// src/lib/claims/store.ts
import 'server-only';
import { and, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
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
  /** Set on the first check that could not find the record of a claim that had proved itself. */
  failingSince: Date | null;
  /** Set on the first check that found a wrong record while the claim was still pending. */
  actionNeededSince: Date | null;
  /** When the last check that asked DNS finished. */
  lastCheckedAt: Date | null;
  /** The DNS host the last check found, or null when it found no nameservers. */
  dnsHost: string | null;
};

/** Postgres unique violation. Both indexes on `claims` are unique, so either can raise it. */
const UNIQUE_VIOLATION = '23505';

/** How far to follow `cause`. Enough for any wrapping here, and short enough that a cause
 * pointing back at its own error cannot spin inside a catch block. */
const CAUSE_DEPTH = 5;

/**
 * Whether this error is Postgres refusing a duplicate, however deep it is wrapped.
 *
 * It reads `code` off the error that was caught, and Drizzle does not throw the driver's error.
 * Since 0.44 it throws its own `DrizzleQueryError` and hangs the original off `cause`, so `code`
 * on what arrives here is undefined and every unique violation read as an outage. That made
 * `held_by_another` unreachable: a challenger who proved control of a name another account holds
 * was told the write had not landed rather than that the name was taken.
 *
 * Walks the chain rather than reaching for `cause` once, since nothing promises how many wrappers
 * there are, and a version of Drizzle that stops wrapping should not break this either.
 *
 * Exported because it is the one thing in this module that can be tested without Postgres.
 */
export const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }
    if ('code' in current && current.code === UNIQUE_VIOLATION) {
      return true;
    }
    if (!('cause' in current)) {
      return false;
    }
    current = current.cause;
  }
  return false;
};

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
  /** Only for the demo namespace, where `expired.test` is created already expired. */
  tokenLifetimeMs?: number;
}): Promise<CreateOutcome> => {
  const now = input.now ?? new Date();
  const lifetime = input.tokenLifetimeMs ?? TOKEN_TTL_MS;

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
             ${generateToken()}, ${new Date(now.getTime() + lifetime).toISOString()}::timestamptz
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
  /**
   * How long this name has been failing its checks, which is the one thing an at-risk row has to
   * say that the status word does not. Null on every other status.
   */
  failingSince: Date | null;
  /** Set while a pending claim has a wrong record at its name. Null otherwise. */
  actionNeededSince: Date | null;
  issuedAt: Date;
  lastCheckedAt: Date | null;
  dnsHost: string | null;
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
      failingSince: claims.failingSince,
      actionNeededSince: claims.actionNeededSince,
      issuedAt: claims.issuedAt,
      lastCheckedAt: claims.lastCheckedAt,
      dnsHost: claims.dnsHost,
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

export type VerifyOutcome = 'verified' | 'unchanged' | 'held_by_another' | 'unavailable';

/**
 * Whether a conditional write moved the row. `unchanged` means the status it was conditional on
 * was no longer the one this check read, which a reload and a second tab both produce.
 */
export type MoveOutcome<Moved extends string> = Moved | 'unchanged' | 'unavailable';

/**
 * Every way a check can leave the row, as one value, so the pure function that decides what the
 * screen says reads one argument rather than three.
 */
export type ClaimWrite =
  | VerifyOutcome
  | MoveOutcome<'at_risk'>
  | MoveOutcome<'recovered'>
  | MoveOutcome<'action_needed'>
  | MoveOutcome<'action_cleared'>;

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
    const rows = await getDb()
      .update(claims)
      .set({ status: 'verified', verifiedAt: at, actionNeededSince: null })
      .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId), eq(claims.status, 'pending')))
      .returning({ id: claims.id });
    return rows.length > 0 ? 'verified' : 'unchanged';
  } catch (error) {
    return isUniqueViolation(error) ? 'held_by_another' : 'unavailable';
  }
};

/**
 * Records that a check could not find the record of a name this account holds.
 *
 * Conditional on the row still being `verified` inside the statement, which makes it idempotent
 * and keeps `failing_since` at the first failure rather than moving it forward on every check
 * after it. A reload writes nothing the second time.
 *
 * Only the failures that prove the record is gone reach this. `shouldMarkAtRisk` is the rule, and
 * it is a pure function with tests, because which failures are allowed to move a held name is the
 * decision in this state and not an implementation detail of the write.
 *
 * `verified` and `at_risk` are both in the owned-name index, so this cannot collide with another
 * account: the row never leaves the index it already sits in.
 */
export const markAtRisk = async (
  id: string,
  ownerId: string,
  at: Date,
): Promise<MoveOutcome<'at_risk'>> => {
  try {
    const rows = await getDb()
      .update(claims)
      .set({ status: 'at_risk', failingSince: at })
      .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId), eq(claims.status, 'verified')))
      .returning({ id: claims.id });
    return rows.length > 0 ? 'at_risk' : 'unchanged';
  } catch {
    return 'unavailable';
  }
};

/**
 * Records that the record of an at-risk name is answering again.
 *
 * `verified_at` is deliberately untouched. The account has held this name since it first proved
 * it, and the record coming back is not a second proof of ownership. Clearing `failing_since` is
 * the whole of the state change.
 */
export const markRecovered = async (
  id: string,
  ownerId: string,
): Promise<MoveOutcome<'recovered'>> => {
  try {
    const rows = await getDb()
      .update(claims)
      .set({ status: 'verified', failingSince: null })
      .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId), eq(claims.status, 'at_risk')))
      .returning({ id: claims.id });
    return rows.length > 0 ? 'recovered' : 'unchanged';
  } catch {
    return 'unavailable';
  }
};

/**
 * Stamp a pending claim as needing the person's attention. Conditional on the claim still being
 * pending and the flag still unset, so a second check that finds the same wrong record writes
 * nothing and the stamp stays at the first failure. The unset guard also lives in `shouldFlagAction`;
 * having it here too keeps the write a no-op under a reload.
 */
export const flagActionNeeded = async (
  id: string,
  ownerId: string,
  at: Date,
): Promise<MoveOutcome<'action_needed'>> => {
  try {
    const rows = await getDb()
      .update(claims)
      .set({ actionNeededSince: at })
      .where(
        and(
          eq(claims.id, id),
          eq(claims.ownerId, ownerId),
          eq(claims.status, 'pending'),
          isNull(claims.actionNeededSince),
        ),
      )
      .returning({ id: claims.id });
    return rows.length > 0 ? 'action_needed' : 'unchanged';
  } catch {
    return 'unavailable';
  }
};

/**
 * Take the flag back off a pending claim once a check no longer finds a wrong record. Conditional
 * on the flag being set, so it is a no-op when there was nothing to clear.
 */
export const clearActionNeeded = async (
  id: string,
  ownerId: string,
): Promise<MoveOutcome<'action_cleared'>> => {
  try {
    const rows = await getDb()
      .update(claims)
      .set({ actionNeededSince: null })
      .where(
        and(
          eq(claims.id, id),
          eq(claims.ownerId, ownerId),
          eq(claims.status, 'pending'),
          isNotNull(claims.actionNeededSince),
        ),
      )
      .returning({ id: claims.id });
    return rows.length > 0 ? 'action_cleared' : 'unchanged';
  } catch {
    return 'unavailable';
  }
};

/**
 * What a check saw, written after every check that asked DNS: when it finished and who serves the
 * zone. Unconditional on status, since it records an observation rather than a transition, and
 * scoped to the owner like every other write.
 *
 * Never fails the check. The answer the person is waiting for is already known, and a missed
 * timestamp only makes the list say an older time.
 */
export const recordObservation = async (
  id: string,
  ownerId: string,
  observation: { checkedAt: Date; dnsHost: string | null },
): Promise<void> => {
  try {
    await getDb()
      .update(claims)
      .set({ lastCheckedAt: observation.checkedAt, dnsHost: observation.dnsHost })
      .where(and(eq(claims.id, id), eq(claims.ownerId, ownerId)));
  } catch {
    // Not logged, for the same reason as the other writes: the statement travels on the error.
  }
};
