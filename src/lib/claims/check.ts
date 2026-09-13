// src/lib/claims/check.ts
import { evaluateClaim, isExpired } from '@/lib/claims/evaluate';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import type { CheckResult } from '@/lib/claims/state';
import type { Claim } from '@/lib/claims/store';
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { createNodeResolver } from '@/lib/dns/nodeResolver';
import { isTestName, scriptFor, testNamespaceEnabled } from '@/lib/dns/testNames';
import { DEFAULT_TIMEOUT_MS, traceName } from '@/lib/dns/trace';
import type { Trace } from '@/lib/dns/types';

export type Check = {
  /** Null when the claim expired, which is decided from the row and needs no query. */
  trace: Trace | null;
  result: CheckResult;
};

/**
 * One check of one claim: ask DNS what is at the record's name, then compare it with the token.
 *
 * The demo namespace is scoped rather than global. A `.test` name can never be a real claim, so
 * the fake resolver is unreachable from any name that could be, and the switch that enables it
 * cannot be used to verify a domain someone else owns.
 */
export const checkClaim = async (claim: Claim, now: Date = new Date()): Promise<Check> => {
  // An expired claim cannot be proved by anything in DNS, so asking would spend a query on a
  // question already answered by the row.
  if (isExpired(claim, now)) {
    return {
      trace: null,
      result: { status: 'failed', reason: { code: 'token_expired', expiredAt: claim.expiresAt } },
    };
  }

  const queriedName = recordFullName(claim.name);
  const expected = formatRecordValue(claim.token, claim.expiresAt);

  const demo =
    testNamespaceEnabled() && isTestName(claim.name) ? scriptFor(claim.name, expected) : null;

  const resolver =
    demo === null ? createNodeResolver(DEFAULT_TIMEOUT_MS) : createFakeResolver(demo);

  const trace = await traceName(resolver, queriedName, { timeoutMs: DEFAULT_TIMEOUT_MS });
  return { trace, result: evaluateClaim(trace, claim, now) };
};
