// src/lib/claims/view.ts
import type { ClaimOutcome } from '@/lib/claims/check';
import { type ClaimMessage, claimCopy, describeClaim } from '@/lib/claims/messages';
import { describeProvider } from '@/lib/claims/provider';
import { holdsTheName } from '@/lib/claims/state';
import { answeredCount, type CheckStep, needsAttention, stepsFor } from '@/lib/claims/steps';

/**
 * One check, as the three regions of the record screen render it.
 *
 * Derived on the server and sent as it will be read. The alternative was sending the trace and the
 * claim and deriving this in the browser, which would put the copy module, the step rules and the
 * provider table into the client bundle so they could produce the same strings a second time.
 *
 * Every field is a string, a number or a boolean. Nothing here is a `Date`, because a date that
 * survives `JSON.stringify` comes back as a string and the type would go on saying `Date`, which
 * is the failure that ends with `Invalid Date` on a screen and nothing in the logs.
 */
export type CheckView = {
  steps: CheckStep[];
  /** Whether the chain opens. The same rule the server rendered, decided once. */
  needsAttention: boolean;
  answered: number;
  status: ClaimMessage;
  /** The line at the foot of the page, or nothing when no nameserver answered. */
  provider: string | null;
  settled: boolean;
};

/**
 * Whether asking again could change anything.
 *
 * The cadence stops on this rather than on the claim being verified, because a verified claim
 * whose record has gone is exactly the case that should keep asking: the record may come back. A
 * claim that proved control of a name another account holds keeps asking too: the next step is the
 * other account releasing it, and the check after that verifies this claim. An expired token cannot
 * be proved by anything in DNS.
 */
const isSettled = (outcome: ClaimOutcome): boolean => {
  if (outcome.result.status === 'verified') {
    return holdsTheName(outcome.status);
  }
  return outcome.result.reason.code === 'token_expired';
};

export const checkView = (outcome: ClaimOutcome): CheckView => {
  const steps = stepsFor(outcome);
  const provider = outcome.trace === null ? null : describeProvider(outcome.trace.nameservers);

  return {
    steps,
    needsAttention: needsAttention(steps),
    answered: answeredCount(steps),
    status: describeClaim(outcome),
    provider:
      provider === null
        ? null
        : provider.recognized
          ? claimCopy.record.provider.recognized(provider.name)
          : claimCopy.record.provider.unrecognized(provider.name),
    settled: isSettled(outcome),
  };
};

/**
 * What the endpoint answers with.
 *
 * A typed value on both ends rather than an HTTP status the client has to interpret. The status
 * code is set to match, so a proxy or a log reads it correctly, and the client reads this.
 */
export type CheckResponse =
  | { ok: true; view: CheckView }
  /** `resumeAt` is an ISO time, on `limited` only, when the next check is allowed. */
  | { ok: false; error: 'limited'; resumeAt: string | null }
  | { ok: false; error: 'unavailable' | 'signed_out' | 'not_found' };
