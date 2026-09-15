// src/components/CheckNow/CheckNow.tsx
'use client';

import type React from 'react';
import { useCheck } from '@/components/CheckRunner/CheckRunner';
import { CHECK_WINDOW_MS } from '@/lib/claims/cadence';
import { claimCopy, formatMinutes, formatSince } from '@/lib/claims/messages';

/**
 * Ask again, and the one line saying when the last answer came and that another is coming.
 *
 * The line is what keeps this from being the Verify button the RFC designed out. The product runs
 * the check and says so beside the control, so pressing this skips a wait rather than being the
 * thing that starts a check at all.
 *
 * Outlined rather than filled. The filled control on this screen is the one in the header, and a
 * second black button beside the claim's name would read as the main thing to do here, which is
 * adding the record.
 */
const CheckNow: React.FC = () => {
  const { view, checking, sinceMs, stopped, recheck } = useCheck();
  const copy = claimCopy.check;

  const line = checking
    ? copy.checking
    : stopped
      ? copy.stopped(formatMinutes(CHECK_WINDOW_MS))
      : sinceMs === null
        ? null
        : view?.settled === true
          ? copy.checkedAt(formatSince(sinceMs))
          : copy.waiting(formatSince(sinceMs));

  return (
    <div className='flex flex-col items-start gap-1.5 sm:items-end'>
      <button
        type='button'
        onClick={recheck}
        disabled={checking}
        className='rounded-md border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 text-sm transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-neutral-400'
      >
        {copy.now}
      </button>
      {line !== null && <span className='text-neutral-500 text-xs sm:text-right'>{line}</span>}
    </div>
  );
};

export default CheckNow;
