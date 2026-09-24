// src/lib/claims/stream.ts
import type { Check } from '@/lib/claims/check';
import type { ClaimDTO } from '@/lib/claims/dto';
import { claimAfterCheck } from '@/lib/claims/evaluate';
import type { ClaimStatus } from '@/lib/claims/state';
import { type CheckStep, stepsFor } from '@/lib/claims/steps';
import type { CheckView } from '@/lib/claims/view';

/**
 * One line of the streamed check. Steps arrive as they are known. `done` carries the whole answer
 * and is the truth: the client replaces whatever it built from the steps with it.
 */
export type CheckEvent =
  | { type: 'step'; index: number; step: CheckStep }
  | { type: 'done'; view: CheckView; claim: ClaimDTO | null }
  | { type: 'error'; error: 'unavailable' };

/** The steps DNS alone settles: the zone, and whether its nameservers answered. */
export const EARLY_STEPS = 2;

/**
 * Steps 01 and 02 from a check whose trace is in and whose write hasn't happened. Neither step
 * reads the claim's status or the second look, so they come out the same as the final answer's.
 * A test holds that for every demo name.
 */
export const earlySteps = (
  claim: { status: ClaimStatus; verifiedAt: Date | null },
  check: Check,
  now: Date,
): CheckStep[] =>
  stepsFor({ ...check, ...claimAfterCheck(claim, null, now, check.result) }).slice(0, EARLY_STEPS);

/** One event as one line of NDJSON. */
export const encodeEvent = (event: CheckEvent): string => `${JSON.stringify(event)}\n`;
