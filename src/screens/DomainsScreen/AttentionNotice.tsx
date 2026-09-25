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
  const count = rows === null ? 0 : attentionCount(rows, filter);
  const copy = claimCopy.list.attention;

  return (
    // The live region is there from the first render, so the notice is announced when it arrives.
    // It slides open: it can only appear once the list has loaded, and opening it smoothly is
    // gentler than the list jumping down.
    <div role='status'>
      {rows !== null && count > 0 && (
        <div className='notice-open grid'>
          <div className='min-h-0 overflow-hidden'>
            <div className='mb-3.5 flex items-center gap-3 rounded-[7px] border border-warn/35 bg-warn/6 px-3.5 py-2.5 text-[13px] text-fg'>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AttentionNotice;
