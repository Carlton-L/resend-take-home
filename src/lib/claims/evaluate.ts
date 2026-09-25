// src/lib/claims/evaluate.ts

import { claimRecords, formatRecordValue, parseRecordValue } from '@/lib/claims/record';
import type { CheckResult, ClaimStatus, FailureReason } from '@/lib/claims/state';
import { holdsTheName } from '@/lib/claims/state';
import type { ClaimWrite } from '@/lib/claims/store';
import type { Trace } from '@/lib/dns/types';

export type ClaimForCheck = {
  token: string;
  expiresAt: Date;
  status: ClaimStatus;
};

/**
 * Compares what DNS holds against what this claim issued.
 *
 * The layer below deliberately knows nothing about tokens, so this is the whole of the comparison
 * and it is a pure function over a trace. Every branch is reachable from the fake resolver, which
 * is why the check needs no network to test.
 *
 * Expiry is read from the claim row rather than from the record. The record value is written by
 * whoever controls the zone, so trusting the expiry inside it would let anyone keep a dead claim
 * alive by publishing a later date.
 */
/**
 * Takes the expiry rather than the whole claim, because that is all it reads. The domain list asks
 * this of a row that carries no token, and a token is not something a list should be selecting.
 */
export const isExpired = (claim: { expiresAt: Date }, now: Date = new Date()): boolean =>
  claim.expiresAt.getTime() <= now.getTime();

/**
 * Whether this claim's token running out is the answer to the check.
 *
 * Only for a claim still trying to prove itself. Verifying does not clear `expires_at`, so every
 * name held for longer than the token's seven days carries an expiry in the past. Reading that
 * without the status first reported "This claim has expired" on names the account holds and
 * stopped the check before it ever asked DNS anything, which left a held claim that lost its
 * record unable to reach `at_risk` after its first week.
 *
 * The same trap `describeClaimRow` guards on the domain list, in the one other place that reads
 * expiry off a row.
 */
export const tokenHasRunOut = (
  claim: { expiresAt: Date; status: ClaimStatus },
  now: Date = new Date(),
): boolean => !holdsTheName(claim.status) && isExpired(claim, now);

export const evaluateClaim = (
  trace: Trace,
  claim: ClaimForCheck,
  now: Date = new Date(),
): CheckResult => {
  if (tokenHasRunOut(claim, now)) {
    return { status: 'failed', reason: { code: 'token_expired', expiredAt: claim.expiresAt } };
  }

  const outcome = trace.outcome;
  switch (outcome.status) {
    case 'zone_not_found':
      return { status: 'failed', reason: { code: 'zone_not_found', walked: outcome.walked } };

    case 'nameservers_unreachable':
      return {
        status: 'failed',
        reason: {
          code: 'nameservers_unreachable',
          attempted: outcome.attempted,
          timeoutMs: outcome.timeoutMs,
        },
      };

    case 'name_not_found':
      return {
        status: 'failed',
        reason: {
          code: 'record_not_found',
          queriedName: trace.queriedName,
          nameservers: trace.nameservers,
          negativeTtlSeconds: trace.negativeTtlSeconds,
        },
      };

    // The name resolves and holds no TXT. A CNAME at the name is indistinguishable from this over
    // the authoritative path, measured 2026-09-12, and separates out when the DoH leg lands.
    case 'no_records':
      return {
        status: 'failed',
        reason: { code: 'no_txt_at_name', queriedName: trace.queriedName },
      };

    case 'records_found': {
      // Only our own records count. TXT records for other services at this name mean our record
      // hasn't been added, the same as nothing at the name.
      const ours = claimRecords(outcome.records);
      if (ours.length === 0) {
        return {
          status: 'failed',
          reason: {
            code: 'record_not_found',
            queriedName: trace.queriedName,
            nameservers: [...trace.nameservers],
            negativeTtlSeconds: trace.negativeTtlSeconds,
          },
        };
      }
      const match = ours.find((record) => parseRecordValue(record)?.token === claim.token);
      if (match !== undefined) {
        return { status: 'verified', record: match, answeredBy: outcome.answeredBy };
      }
      return {
        status: 'failed',
        reason: {
          code: 'value_mismatch',
          expected: formatRecordValue(claim.token, claim.expiresAt),
          found: ours,
        },
      };
    }

    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
};

/**
 * Whether this check should move the row to verified.
 *
 * Only a pending claim is written. A claim that already holds its name is already verified, and a
 * claim that was revoked is not brought back by a record still sitting in a zone.
 */
export const shouldMarkVerified = (claim: { status: ClaimStatus }, result: CheckResult): boolean =>
  result.status === 'verified' && claim.status === 'pending';

/**
 * Whether this failure proves the record is gone, rather than proving nothing.
 *
 * Only the reasons where the nameservers answered and had nothing, or had the wrong value. A
 * timeout is the weakest signal this product has from one vantage point, and a zone that cannot be
 * reached says nothing at all about what is in it, so neither moves a name the account holds.
 *
 * Exhaustive, so a reason added to the union has to be sorted into one side of this before the
 * build passes.
 */
export const provesRecordGone = (reason: FailureReason): boolean => {
  switch (reason.code) {
    // The nameservers answered. The name has nothing at it, has something other than a TXT record,
    // has the record one label further down, or has a TXT record holding a different value. In
    // every one of them the zone was read and this claim's record was not in it.
    case 'record_not_found':
    case 'no_txt_at_name':
    case 'appended_zone_suspected':
    case 'value_mismatch':
      return true;

    // Nothing answered, or nothing was found to ask. Both are a view of DNS that failed rather
    // than a zone that changed, and flipping a held name on either would be the overconfidence a
    // single vantage point already costs this product once.
    case 'nameservers_unreachable':
    case 'zone_not_found':
      return false;

    // Decided from the row before any query, and unreachable on a claim that holds its name.
    case 'token_expired':
      return false;

    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
};

/**
 * Whether this check should move a held claim to `at_risk`.
 *
 * `verified` only. `contested` is held too, and it carries a challenge this product cannot resolve
 * yet, so a check has no business moving it. `at_risk` is already there and the stamp stays at the
 * first failure rather than being pushed forward by every check after it.
 */
export const shouldMarkAtRisk = (claim: { status: ClaimStatus }, result: CheckResult): boolean =>
  claim.status === 'verified' && result.status === 'failed' && provesRecordGone(result.reason);

/** Whether this check should take a claim back out of `at_risk`. The record is answering again. */
export const shouldMarkRecovered = (claim: { status: ClaimStatus }, result: CheckResult): boolean =>
  claim.status === 'at_risk' && result.status === 'verified';

/**
 * Whether this failure means a wrong record is at the name, which is the person's move.
 *
 * A tighter set than `provesRecordGone`. The nameservers answered and returned a record that is
 * not this claim's: a TXT with a different value, a record of another type, or the record one
 * label further down. `record_not_found` is excluded, because nothing at the name is the normal
 * waiting state of a claim whose record has not been added yet, not a mistake to fix. An
 * unreachable zone and a zone with no nameservers are waiting or ambiguous, and an expired token
 * is already shown on the list as `Expired`, so none of them set the flag.
 *
 * Exhaustive, so a reason added to the union has to be sorted here before the build passes.
 */
export const needsUserAction = (reason: FailureReason): boolean => {
  switch (reason.code) {
    case 'no_txt_at_name':
    case 'appended_zone_suspected':
    case 'value_mismatch':
      return true;
    case 'record_not_found':
    case 'nameservers_unreachable':
    case 'zone_not_found':
    case 'token_expired':
      return false;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
};

/**
 * Whether this check should stamp a pending claim as needing the person's attention.
 *
 * Pending only: a verified claim losing its record is `at_risk`, a different state. Conditional on
 * the flag being unset so a second check finding the same thing writes nothing, which keeps the
 * stamp at the first failure and makes the write a no-op under a reload.
 */
export const shouldFlagAction = (
  claim: { status: ClaimStatus; actionNeededSince: Date | null },
  result: CheckResult,
): boolean =>
  claim.status === 'pending' &&
  claim.actionNeededSince === null &&
  result.status === 'failed' &&
  needsUserAction(result.reason);

/**
 * Whether this check should take the flag back off a pending claim.
 *
 * The flag is set, the claim is still pending, and this check no longer finds a wrong record: the
 * person removed it, or it was replaced with the right one and the next check will verify. A
 * claim that verifies is handled by `markVerified`, which clears the flag as it moves the row, so
 * this only fires when the claim stays pending and drops back to waiting.
 */
export const shouldClearAction = (
  claim: { status: ClaimStatus; actionNeededSince: Date | null },
  result: CheckResult,
): boolean =>
  claim.status === 'pending' &&
  claim.actionNeededSince !== null &&
  !(result.status === 'failed' && needsUserAction(result.reason));

/** What the screen should say about a claim once this check has been through the database. */
export type ClaimAfterCheck = {
  status: ClaimStatus;
  verifiedAt: Date | null;
  /** Control was proved and another account holds the name. */
  provedButHeld: boolean;
  /** This check is the one that found the record again and took the claim back out of `at_risk`. */
  recovered: boolean;
  /** A pending claim with a wrong record at the name. The person's move, shown on the record pill. */
  actionNeeded: boolean;
};

/**
 * The claim as it stands after a check, decided from the write rather than from the check.
 *
 * The check saying verified is an observation. The row moving is the fact, and the two can differ:
 * the update can hit the partial unique index because another account verified the same name in
 * between, and it can fail outright. Both leave the claim where it was, so the screen says where it
 * was.
 *
 * Pure, so the page and the check render from one answer instead of each deciding for themselves.
 * That is the whole point: the status at the top of the record screen and the result below it are
 * two views of this one value.
 */
export const claimAfterCheck = (
  claim: { status: ClaimStatus; verifiedAt: Date | null },
  /** Null when no write was attempted. */
  write: ClaimWrite | null,
  at: Date,
  result: CheckResult,
): ClaimAfterCheck => {
  if (write === 'verified') {
    return {
      status: 'verified',
      verifiedAt: at,
      provedButHeld: false,
      recovered: false,
      actionNeeded: false,
    };
  }

  if (write === 'at_risk') {
    return {
      status: 'at_risk',
      verifiedAt: claim.verifiedAt,
      provedButHeld: false,
      recovered: false,
      actionNeeded: false,
    };
  }

  // Recovery keeps the date the name was proved. `at` is when the record came back, and stamping
  // it here would report a name held since March as proved a moment ago, on the status line and in
  // the last step of the chain.
  if (write === 'recovered') {
    return {
      status: 'verified',
      verifiedAt: claim.verifiedAt,
      provedButHeld: false,
      recovered: true,
      actionNeeded: false,
    };
  }

  // The claim stays pending here. The pill reads Action needed from the live result rather than
  // the stored flag, so it is right even under a reload where the flag is already set and no write
  // happened, and the record screen never disagrees with its own check.
  return {
    status: claim.status,
    verifiedAt: claim.verifiedAt,
    provedButHeld: write === 'held_by_another',
    recovered: false,
    actionNeeded:
      claim.status === 'pending' && result.status === 'failed' && needsUserAction(result.reason),
  };
};
