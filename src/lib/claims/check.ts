// src/lib/claims/check.ts
import { diagnose } from '@/lib/claims/diagnose';
import {
  type ClaimAfterCheck,
  claimAfterCheck,
  evaluateClaim,
  shouldClearAction,
  shouldFlagAction,
  shouldMarkAtRisk,
  shouldMarkRecovered,
  shouldMarkVerified,
  tokenHasRunOut,
} from '@/lib/claims/evaluate';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import type { CheckResult } from '@/lib/claims/state';
import {
  type Claim,
  type ClaimWrite,
  clearActionNeeded,
  flagActionNeeded,
  markAtRisk,
  markRecovered,
  markVerified,
} from '@/lib/claims/store';
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
  // A claim still trying to prove itself, whose token has run out, cannot be proved by anything in
  // DNS, so asking would spend a query on a question already answered by the row. A claim that
  // holds its name is past this: verifying does not clear `expires_at`, so every name held longer
  // than the token's seven days carries an expiry in the past and would otherwise stop here
  // instead of checking whether its record is still there.
  if (tokenHasRunOut(claim, now)) {
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
  const result = evaluateClaim(trace, claim, now);

  // A second look, only on a failure and only for the two reasons a probe can speak to. The trace
  // layer stays a pure description of what DNS holds at one name; asking a second question about a
  // second name belongs here, above it.
  return { trace, result: await diagnose(resolver, trace, claim, result) };
};

/** A check, plus where it left the claim. One value, so every part of the screen agrees. */
export type ClaimOutcome = Check & ClaimAfterCheck;

/**
 * Run the check and record what it found.
 *
 * The write is an observation rather than an action the user asked for: conditional on the row
 * still being pending, scoped to its owner in the same statement, and therefore a no-op under a
 * reload. The page is `force-dynamic`, so nothing prerenders or caches it into a shared copy.
 *
 * This returns one value that the status at the top of the record screen, the chain below it and
 * the provider line at the foot all render from, so the three cannot disagree. It runs once per
 * request to the check endpoint, which is the only caller.
 */
export const runCheck = async (claim: Claim, now: Date = new Date()): Promise<ClaimOutcome> => {
  const { trace, result } = await checkClaim(claim, now);
  const write = await recordCheck(claim, result, now);

  return { trace, result, ...claimAfterCheck(claim, write, now, result) };
};

/**
 * The one write this check earns, or none.
 *
 * Three transitions, each decided by a pure rule and each conditional on the same status inside
 * its own statement. They cannot both apply: the rules read the status the check started from and
 * no two of them accept the same one.
 *
 * A claim that stays where it is writes nothing. Most checks are that, and a check is an
 * observation rather than something the person asked to happen.
 */
const recordCheck = async (
  claim: Claim,
  result: CheckResult,
  now: Date,
): Promise<ClaimWrite | null> => {
  if (shouldMarkVerified(claim, result)) {
    const outcome = await markVerified(claim.id, claim.ownerId, now);
    // A successful verify clears the flag inside its own statement. A verify that hit the unique
    // index proved control against a name another account holds, so the row stayed pending and its
    // statement rolled back; the flag, if it was set, is now stale and gets its own clear. Rare
    // path, and only when the flag was actually set.
    if (outcome === 'held_by_another' && claim.actionNeededSince !== null) {
      await clearActionNeeded(claim.id, claim.ownerId);
    }
    return outcome;
  }
  if (shouldMarkAtRisk(claim, result)) {
    return markAtRisk(claim.id, claim.ownerId, now);
  }
  if (shouldMarkRecovered(claim, result)) {
    return markRecovered(claim.id, claim.ownerId);
  }
  // Pending only, and mutually exclusive with the three above: a pending claim either verifies
  // (handled first, and that write clears the flag) or stays pending, where it is flagged when a
  // wrong record is found and un-flagged when one is not.
  if (shouldFlagAction(claim, result)) {
    return flagActionNeeded(claim.id, claim.ownerId, now);
  }
  if (shouldClearAction(claim, result)) {
    return clearActionNeeded(claim.id, claim.ownerId);
  }
  return null;
};
