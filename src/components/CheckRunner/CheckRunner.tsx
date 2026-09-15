// src/components/CheckRunner/CheckRunner.tsx
'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { nextCheck } from '@/lib/claims/cadence';
import { claimCheckPath } from '@/lib/claims/config';
import type { CheckResponse, CheckView } from '@/lib/claims/view';

/** Why the last attempt produced no answer. Each one has a message and one way back. */
export type CheckError = 'limited' | 'unavailable' | 'offline' | 'signed_out' | 'not_found';

export type CheckContext = {
  /** The last check that answered, or null before the first one has. */
  view: CheckView | null;
  /** A request is in flight. The only thing on this screen allowed to animate. */
  checking: boolean;
  /** Milliseconds since the last answer, or null before the first one. */
  sinceMs: number | null;
  /** The window ran out, so nothing is scheduled and the screen says so. */
  stopped: boolean;
  error: CheckError | null;
  /** Ask now, and start the cadence over. */
  recheck: () => void;
};

const Context = createContext<CheckContext | null>(null);

/**
 * Read the running check from anywhere under the runner.
 *
 * Throws rather than returning a value, because a component outside the provider is a wiring
 * mistake rather than a state the product reports. Every failure a user can see is a value.
 */
export const useCheck = (): CheckContext => {
  const value = useContext(Context);
  if (value === null) {
    throw new Error('useCheck must be used inside CheckRunner');
  }
  return value;
};

/** How often the relative time re-renders. Coarse, because the string it produces is coarse. */
const TICK_MS = 15_000;

type CheckRunnerProps = {
  claimId: string;
  children: React.ReactNode;
};

/**
 * Runs the check from the browser and hands the result to the three regions that render it.
 *
 * The check used to run in the page body on the server. It moved here so it can be rate limited at
 * an endpoint, so the domain list can prefetch a row again, and so the five steps can be asked
 * again without the person reloading. The cost is that a browser with JavaScript off sees the
 * record and no check, which is the trade recorded in the RFC: the record is what the user came
 * for and proving control is the part that needs a round trip.
 *
 * The page below is still Server Components. This wraps them and passes them straight through as
 * `children`, which is the App Router shape for putting client state around server-rendered
 * markup: the children are rendered on the server and handed to this component already built, so
 * nothing inside them is pulled into the browser bundle.
 */
const CheckRunner: React.FC<CheckRunnerProps> = ({ claimId, children }) => {
  const [view, setView] = useState<CheckView | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState<CheckError | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Refs rather than state for everything the schedule reads. A timer set in one render would
  // otherwise close over the counts as they were at the moment it was set.
  const inFlight = useRef(false);
  const checksDone = useRef(0);
  const startedAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // Wrapped so it is stable across renders and can be named as a dependency honestly. Declared
  // once and used by the schedule, by Check now and by the unmount cleanup, which is three callers
  // that must not each keep their own idea of which timer is running.
  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const run = useCallback(
    async (manual: boolean) => {
      // A check already on its way. Pressing the button again while one is running should not send
      // a second, since the answer to both would be the same one.
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      clearTimer();

      if (manual || startedAt.current === null) {
        // Check now restarts the cadence. Someone pressing it has just done something to their
        // zone, which is the moment the schedule was designed around.
        startedAt.current = Date.now();
        checksDone.current = 0;
        setStopped(false);
        setError(null);
      }

      setChecking(true);

      let answer: CheckResponse | null = null;
      try {
        const response = await fetch(claimCheckPath(claimId), {
          method: 'POST',
          headers: { accept: 'application/json' },
        });
        answer = (await response.json()) as CheckResponse;
      } catch {
        // The request never got an answer. A dropped connection and a page being closed look the
        // same here, and only one of them is still on screen to be told.
        answer = null;
      }

      inFlight.current = false;
      if (!mounted.current) {
        return;
      }
      setChecking(false);

      if (answer === null) {
        setError('offline');
        return;
      }

      if (!answer.ok) {
        setError(answer.error);
        return;
      }

      setError(null);
      setView(answer.view);
      const landed = Date.now();
      setCheckedAt(landed);
      setNow(landed);
      checksDone.current += 1;

      // Nothing left to find out. Stopping here rather than at the window means a verified claim
      // does not sit polling for fifteen minutes to be told the same thing.
      if (answer.view.settled) {
        return;
      }

      const next = nextCheck({
        checksDone: checksDone.current,
        startedAt: startedAt.current ?? landed,
        now: landed,
      });
      if (next.state === 'stopped') {
        setStopped(true);
        return;
      }
      timer.current = setTimeout(() => {
        void run(false);
      }, next.delayMs);
    },
    [claimId, clearTimer],
  );

  useEffect(() => {
    mounted.current = true;
    void run(false);
    return () => {
      mounted.current = false;
      clearTimer();
    };
  }, [run, clearTimer]);

  // The relative time only moves while there is something to count from and nothing in flight.
  useEffect(() => {
    if (checkedAt === null || checking) {
      return;
    }
    const tick = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    return () => {
      clearInterval(tick);
    };
  }, [checkedAt, checking]);

  const recheck = useCallback(() => {
    void run(true);
  }, [run]);

  return (
    <Context.Provider
      value={{
        view,
        checking,
        sinceMs: checkedAt === null ? null : Math.max(0, now - checkedAt),
        stopped,
        error,
        recheck,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default CheckRunner;
