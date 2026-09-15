// src/lib/claims/cadence.ts

/**
 * How long the record screen waits between checks while a claim can still change.
 *
 * Measured from when the previous check returned rather than from when it started. A check on a
 * healthy zone costs about 250ms and one against unreachable nameservers costs the deadline on
 * every step it reaches, so a fixed interval from the start would overlap requests against exactly
 * the zones that are already struggling.
 *
 * The first gap is short because the person who added the record before claiming the name is one
 * check away from being finished. After that it opens out, since the rest of them are waiting on
 * someone to edit a DNS panel.
 */
export const CHECK_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000] as const;

/** Every gap after the backoff is spent. */
export const CHECK_STEADY_MS = 60_000;

/**
 * How long the screen keeps asking before it stops and says so.
 *
 * A page left open overnight should not keep a tab polling, and a person who has not added the
 * record in fifteen minutes has gone to do something else. Check now restarts it.
 */
export const CHECK_WINDOW_MS = 15 * 60 * 1000;

export type NextCheck =
  | { state: 'due'; delayMs: number }
  /** The window is spent. Nothing is scheduled and the screen says it stopped. */
  | { state: 'stopped' };

/**
 * When to ask again, from how many checks have finished and when the first one started.
 *
 * Pure, so the schedule is a unit test rather than something to sit and watch. A check that
 * settles the claim never reaches this: the caller stops instead, because there is a difference
 * between nothing left to find out and giving up on finding out.
 */
export const nextCheck = (input: {
  checksDone: number;
  startedAt: number;
  now: number;
}): NextCheck => {
  if (input.now - input.startedAt >= CHECK_WINDOW_MS) {
    return { state: 'stopped' };
  }

  // Index from the check that just finished. The first return waits the first gap.
  const delayMs = CHECK_BACKOFF_MS[input.checksDone - 1] ?? CHECK_STEADY_MS;
  return { state: 'due', delayMs };
};
