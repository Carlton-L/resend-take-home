// src/screens/DomainsScreen/AttentionNotice.tsx
'use client';

import type React from 'react';
import { attentionCount, showTarget } from '@/lib/claims/listView';
import { claimCopy } from '@/lib/claims/messages';
import { useListRows } from '@/screens/DomainsScreen/useListRows';

/**
 * Above the list whenever a claim needs the person. Said in words, since a sort or a filter can
 * put those rows out of view. Show filters the list to them.
 */
const AttentionNotice: React.FC = () => {
  const { rows, filter, set } = useListRows();
  if (rows === null) {
    return null;
  }
  const count = attentionCount(rows, filter);
  if (count === 0) {
    return null;
  }

  const copy = claimCopy.list.attention;
  return (
    <div
      role='status'
      className='enter-up mb-3.5 flex items-center gap-3 rounded-[7px] border border-warn/35 bg-warn/6 px-3.5 py-2.5 text-[13px] text-fg'
    >
      <span
        aria-hidden='true'
        className='grid size-5 flex-none place-items-center rounded-full bg-warn font-bold font-sans text-[12px] text-on-warn leading-none'
      >
        !
      </span>
      <span className='flex-1'>{copy.count(count)}</span>
      <button
        type='button'
        onClick={() => set('status', showTarget(rows))}
        className='inline-flex h-7 items-center rounded-[7px] border border-warn/45 px-2.5 font-medium text-warn text-xs transition-colors hover:bg-warn/10 focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
      >
        {copy.show}
      </button>
    </div>
  );
};

export default AttentionNotice;
