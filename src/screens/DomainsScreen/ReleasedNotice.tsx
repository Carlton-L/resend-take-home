// src/screens/DomainsScreen/ReleasedNotice.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { shell, useShell } from '@/client/shellStore';
import { domainsCopy } from '@/lib/copy/domains';

/**
 * Said once, under the list, after a claim is released. It stays until closed or until you leave
 * the screen, since removing the record is a step to take in another tab.
 */
const ReleasedNotice: React.FC = () => {
  const { released } = useShell();
  // The screen arrives with the notice already set. A live region that mounts holding its text
  // isn't reliably announced, so the text goes in a moment after the region.
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSaid(released));
    return () => cancelAnimationFrame(frame);
  }, [released]);

  // Leaving the screen clears it, so it doesn't come back on the next visit.
  useEffect(() => () => shell.released(null), []);

  return (
    <div role='status'>
      {said !== null && released !== null && (
        <div className='enter-up mt-3.5 flex items-center gap-3 rounded-[7px] border border-line-control bg-surface px-3.5 py-2.5 text-[13px] text-fg'>
          <span className='flex-1'>{domainsCopy.list.released(said)}</span>
          <button
            type='button'
            onClick={() => shell.released(null)}
            aria-label={domainsCopy.list.dismiss}
            className='rounded px-1.5 py-0.5 text-fg-3 text-lg leading-none hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ReleasedNotice;
