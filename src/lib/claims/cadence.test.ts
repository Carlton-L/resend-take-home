// src/lib/claims/cadence.test.ts
import { describe, expect, it } from 'vitest';
import {
  CHECK_BACKOFF_MS,
  CHECK_STEADY_MS,
  CHECK_WINDOW_MS,
  nextCheck,
} from '@/lib/claims/cadence';

const START = 1_000_000;

describe('nextCheck', () => {
  it('walks the backoff once per finished check', () => {
    const delays = [1, 2, 3, 4].map((checksDone) =>
      nextCheck({ checksDone, startedAt: START, now: START + 1000 }),
    );
    expect(delays).toEqual(CHECK_BACKOFF_MS.map((delayMs) => ({ state: 'due', delayMs })));
  });

  it('holds the steady gap once the backoff is spent', () => {
    for (const checksDone of [5, 6, 20]) {
      expect(nextCheck({ checksDone, startedAt: START, now: START + 1000 })).toEqual({
        state: 'due',
        delayMs: CHECK_STEADY_MS,
      });
    }
  });

  it('stops once the window is spent', () => {
    expect(nextCheck({ checksDone: 12, startedAt: START, now: START + CHECK_WINDOW_MS })).toEqual({
      state: 'stopped',
    });
  });

  it('keeps going up to the last moment of the window', () => {
    expect(
      nextCheck({ checksDone: 12, startedAt: START, now: START + CHECK_WINDOW_MS - 1 }),
    ).toEqual({ state: 'due', delayMs: CHECK_STEADY_MS });
  });
});
