// src/lib/claims/evaluate.ts

import { formatRecordValue, parseRecordValue } from '@/lib/claims/record';
import type { CheckResult, ClaimStatus } from '@/lib/claims/state';
import type { VerifyOutcome } from '@/lib/claims/store';
import type { Trace } from '@/lib/dns/types';

export type ClaimForCheck = {
  token: string;
  expiresAt: Date;
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

export const evaluateClaim = (
  trace: Trace,
  claim: ClaimForCheck,
  now: Date = new Date(),
): CheckResult => {
  if (isExpired(claim, now)) {
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
      const match = outcome.records.find(
        (record) => parseRecordValue(record)?.token === claim.token,
      );
      if (match !== undefined) {
        return { status: 'verified', record: match, answeredBy: outcome.answeredBy };
      }
      return {
        status: 'failed',
        reason: {
          code: 'value_mismatch',
          expected: formatRecordValue(claim.token, claim.expiresAt),
          found: outcome.records,
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

/** What the screen should say about a claim once this check has been through the database. */
export type ClaimAfterCheck = {
  status: ClaimStatus;
  verifiedAt: Date | null;
  /** Control was proved and another account holds the name. */
  provedButHeld: boolean;
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
  write: VerifyOutcome | null,
  at: Date,
): ClaimAfterCheck => {
  if (write === 'verified') {
    return { status: 'verified', verifiedAt: at, provedButHeld: false };
  }

  return {
    status: claim.status,
    verifiedAt: claim.verifiedAt,
    provedButHeld: write === 'held_by_another',
  };
};
