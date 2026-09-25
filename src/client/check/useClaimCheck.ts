// src/client/check/useClaimCheck.ts
'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { CLAIMS_KEY, claimKey } from '@/client/api';
import {
  type CheckError,
  type CheckMode,
  checkReducer,
  initialCheckState,
} from '@/client/check/checkReducer';
import { readNdjson } from '@/client/check/ndjson';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { nextCheck } from '@/lib/claims/cadence';
import { claimCheckPath } from '@/lib/claims/config';
import type { ClaimDetailDTO, ClaimDTO } from '@/lib/claims/dto';
import type { CheckStep } from '@/lib/claims/steps';
import type { CheckEvent } from '@/lib/claims/stream';

/** How long each step shows as running before it lands, from the design. */
export const STEP_MS = 450;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The time in a refusal from the check limit, or null when it has none. */
const readResumeAt = async (response: Response): Promise<number | null> => {
  try {
    const body = (await response.json()) as { resumeAt?: unknown };
    const at = typeof body.resumeAt === 'string' ? Date.parse(body.resumeAt) : Number.NaN;
    return Number.isNaN(at) ? null : at;
  } catch {
    return null;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ClaimCheck = ReturnType<typeof useClaimCheck>;

/**
 * Runs the checks for one claim while its screen is open.
 *
 * Opening the claim shows its stored state at once, then checks: in the background when the
 * nameservers are already known, step by step on a claim that has never been checked. After that
 * the schedule from `cadence.ts` runs, measured from each answer, and stops after 15 minutes or
 * once asking again can't change anything. Check now restarts it. A hidden tab doesn't check.
 *
 * Steps arrive from the stream within milliseconds of each other. They are shown one at a time,
 * 450ms apart, and a background check only animates the steps that changed. Steps after the one
 * that stopped the check land without running. The claim in the
 * cache, and so the pill, the list and the sidebar, updates once the last step has landed.
 */
export const useClaimCheck = (
  claim: ClaimDetailDTO | undefined,
  /** Whether step `index` is on screen. A step that isn't lands without being played. */
  onScreen: (index: number) => boolean = () => true,
) => {
  const [state, dispatch] = useReducer(checkReducer, initialCheckState);
  const { mutate } = useSWRConfig();

  const [nextAt, setNextAt] = useState<number | null>(null);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);
  /** When the check limit lets the next check through, after a refusal. */
  const [resumeAt, setResumeAt] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const inFlight = useRef(false);
  const checksDone = useRef(0);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const due = useRef(false);
  const runToken = useRef(0);
  const run = useRef<(mode: CheckMode) => Promise<void>>(async () => {});
  const onScreenRef = useRef(onScreen);
  onScreenRef.current = onScreen;

  const id = claim?.id ?? null;

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(
    (settled: boolean) => {
      clearTimer();
      if (settled) {
        setNextAt(null);
        setStopped(false);
        return;
      }
      const next = nextCheck({
        checksDone: checksDone.current,
        startedAt: startedAt.current,
        now: Date.now(),
      });
      if (next.state === 'stopped') {
        setNextAt(null);
        setStopped(true);
        return;
      }
      setStopped(false);
      setNextAt(Date.now() + next.delayMs);
      timer.current = setTimeout(() => {
        timer.current = null;
        if (document.visibilityState === 'hidden') {
          // Picked up again when the tab is visible.
          due.current = true;
          return;
        }
        void run.current('background');
      }, next.delayMs);
    },
    [clearTimer],
  );

  run.current = async (mode: CheckMode) => {
    if (id === null || inFlight.current) {
      return;
    }
    inFlight.current = true;
    runToken.current += 1;
    const token = runToken.current;
    due.current = false;
    clearTimer();
    setNextAt(null);
    dispatch({ type: 'start', mode });
    setResumeAt(null);

    const controller = new AbortController();
    abort.current = controller;
    const pace = reducedMotion() ? 0 : STEP_MS;

    // `lastAt` stays on the last answer. A check that did not run is not a check that happened.
    const fail = (error: CheckError) => {
      dispatch({ type: 'fail', error });
      checksDone.current += 1;
      // Refused by the limit or gone: asking again on a timer can't help.
      if (error === 'limited' || error === 'not_found') {
        clearTimer();
        setNextAt(null);
        return;
      }
      schedule(false);
    };

    try {
      const response = await fetch(claimCheckPath(id), {
        method: 'POST',
        signal: controller.signal,
        headers: { accept: 'application/x-ndjson' },
      });
      const type = response.headers.get('content-type') ?? '';
      if (!type.includes('application/x-ndjson') || response.body === null) {
        if (response.status === 401) {
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`);
          return;
        }
        if (response.status === 429) {
          setResumeAt(await readResumeAt(response));
          fail('limited');
          return;
        }
        fail(response.status === 404 ? 'not_found' : 'unavailable');
        return;
      }

      // Events go through one chain, so each reveal waits for the one before it.
      let chain = Promise.resolve();
      const reveal = async (index: number, step: CheckStep) => {
        const shown = stateRef.current.steps[index];
        const same = mode === 'background' && shown?.state === step.state;
        // A step the check never reached lands as it is. Running it would pulse past the step
        // that stopped the check.
        const reached = step.state !== 'idle';
        if (reached && !same && pace > 0 && onScreenRef.current(index)) {
          dispatch({ type: 'run', index });
          await sleep(pace);
        }
        if (!controller.signal.aborted) {
          dispatch({ type: 'land', index, step });
        }
      };

      let finished = false;
      await readNdjson<CheckEvent>(response.body, (event) => {
        if (event.type === 'step') {
          chain = chain.then(() => reveal(event.index, event.step));
          return;
        }
        if (event.type === 'error') {
          finished = true;
          chain = chain.then(() => fail('unavailable'));
          return;
        }
        finished = true;
        chain = chain.then(() => {
          if (controller.signal.aborted) {
            return;
          }
          dispatch({ type: 'done', view: event.view });
          checksDone.current += 1;
          setLastAt(Date.now());
          if (event.claim !== null) {
            const fresh: ClaimDTO = event.claim;
            void mutate<ClaimDetailDTO>(
              claimKey(id),
              (current) => (current === undefined ? current : { ...current, ...fresh }),
              { revalidate: false },
            );
            void mutate<ClaimDTO[]>(
              CLAIMS_KEY,
              (list) => list?.map((row) => (row.id === id ? fresh : row)),
              { revalidate: false },
            );
          }
          schedule(event.view.settled);
        });
      });
      await chain;
      if (!finished && !controller.signal.aborted) {
        fail('offline');
      }
    } catch {
      if (!controller.signal.aborted) {
        fail('offline');
      }
    } finally {
      // A newer check may have taken over after this one was cut off.
      if (runToken.current === token) {
        inFlight.current = false;
      }
    }
  };

  /** Check now: cut off any check in flight, restart the schedule and reveal every step. */
  const checkNow = useCallback(() => {
    if (inFlight.current) {
      abort.current?.abort();
      inFlight.current = false;
    }
    checksDone.current = 0;
    startedAt.current = Date.now();
    void run.current('live');
  }, []);

  // The first check when the claim arrives, once per claim.
  const firstFor = useRef<string | null>(null);
  const known = claim === undefined ? null : claim.dnsHost !== null || claim.status !== 'pending';
  useEffect(() => {
    if (id === null || firstFor.current === id) {
      return;
    }
    firstFor.current = id;
    checksDone.current = 0;
    startedAt.current = Date.now();
    void run.current(known ? 'background' : 'live');
  }, [id, known]);

  // A hidden tab doesn't check. A check that fell due while it was hidden runs on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && due.current) {
        void run.current('background');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Leaving the screen stops everything.
  useEffect(
    () => () => {
      clearTimer();
      abort.current?.abort();
    },
    [clearTimer],
  );

  return { state, nextAt, lastAt, stopped, resumeAt, checkNow };
};
