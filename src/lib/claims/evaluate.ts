// src/lib/claims/evaluate.ts

import { formatRecordValue, parseRecordValue } from '@/lib/claims/record';
import type { CheckResult } from '@/lib/claims/state';
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
export const isExpired = (claim: ClaimForCheck, now: Date = new Date()): boolean =>
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
