// src/screens/ClaimScreen/CheckTimer.tsx
'use client';

import type React from 'react';
import { useState } from 'react';
import { useNow } from '@/client/useNow';
import { claimScreenCopy } from '@/lib/copy/claim';

type CheckTimerProps = {
  running: boolean;
  nextAt: number | null;
  lastAt: number | null;
  stopped: boolean;
};

/** "8s ago", "2 min ago". Seconds here, because the person is watching this line. */
const agoOf = (ms: number): string => {
  const copy = claimScreenCopy.ago;
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 3) {
    return copy.now;
  }
  if (seconds < 60) {
    return copy.seconds(seconds);
  }
  return copy.minutes(Math.floor(seconds / 60));
};

/**
 * When the next check runs and when the last one did. On a phone one fact at a time, and a tap
 * swaps them. Waiting never looks like nothing is happening: the count is always moving.
 */
const CheckTimer: React.FC<CheckTimerProps> = ({ running, nextAt, lastAt, stopped }) => {
  const now = useNow(1000);
  const [showLast, setShowLast] = useState(false);
  const copy = claimScreenCopy.timer;

  if (now === null) {
    return <span className='min-h-5' />;
  }

  const t = now.getTime();
  const last = lastAt === null ? null : copy.last(agoOf(t - lastAt));
  const checked = lastAt === null ? null : copy.checked(agoOf(t - lastAt));

  let wide: React.ReactNode = null;
  let first: React.ReactNode = null;
  if (running) {
    wide = <em className='text-fg not-italic'>{copy.checkingNow}</em>;
    first = wide;
  } else if (nextAt !== null) {
    const next = copy.next(Math.max(0, Math.ceil((nextAt - t) / 1000)));
    wide = (
      <>
        {next}
        {last === null ? '' : ` · ${last}`}
      </>
    );
    first = next;
  } else if (stopped) {
    wide = (
      <>
        {copy.stopped}
        {last === null ? '' : ` · ${last}`}
      </>
    );
    first = copy.stoppedShort;
  }

  if (wide === null) {
    return null;
  }

  // Off inside whatever live region holds it. The count changes every second, and a screen reader
  // would read every one.
  return (
    <span aria-live='off'>
      <span className='font-mono text-[12px] text-fg-3 tabular-nums max-[720px]:hidden'>
        {wide}
      </span>
      <button
        type='button'
        onClick={() => setShowLast((value) => !value)}
        className='hidden text-left font-mono text-[12px] text-fg-3 tabular-nums max-[720px]:inline'
      >
        {showLast && checked !== null ? checked : first}
      </button>
    </span>
  );
};

export default CheckTimer;
