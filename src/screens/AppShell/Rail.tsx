// src/screens/AppShell/Rail.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { useClaims } from '@/client/queries';
import { shell, useShell } from '@/client/shellStore';
import { useNow } from '@/client/useNow';
import BrandMark from '@/components/BrandMark/BrandMark';
import Favicon from '@/components/Favicon/Favicon';
import PlusBox from '@/components/PlusBox/PlusBox';
import { claimPath, DOMAINS_PATH } from '@/lib/claims/config';
import { claimRowView } from '@/lib/claims/row';
import { domainsCopy } from '@/lib/copy/domains';
import { TONE_TEXT } from '@/screens/AppShell/tone';

/** Leaves focus nowhere inside the rail, so it closes once the pointer leaves. */
const blurActive = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

/**
 * The claims, as a column of favicons that opens on hover. Fixed to the left edge and drawn over
 * the page when open, so opening it never moves anything.
 *
 * Claim a domain closes it until the pointer leaves, then sends you to the input.
 */
const Rail: React.FC = () => {
  const { data: claims } = useClaims();
  const { added } = useShell();
  const now = useNow();
  const pathname = usePathname();
  const router = useRouter();
  const [shut, setShut] = useState(false);

  const open = shut
    ? ''
    : 'hover:w-[280px] hover:shadow-[24px_0_60px_rgba(0,0,0,0.55)] focus-within:w-[280px] focus-within:shadow-[24px_0_60px_rgba(0,0,0,0.55)]';
  const fade = shut
    ? 'opacity-0'
    : 'opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 group-hover/rail:delay-[60ms] group-focus-within/rail:opacity-100';

  const claimNew = () => {
    blurActive();
    setShut(true);
    shell.focusClaimInput();
    if (pathname !== DOMAINS_PATH) {
      router.push(DOMAINS_PATH);
    }
  };

  return (
    <aside
      aria-label={domainsCopy.sidebar.label}
      onMouseLeave={() => setShut(false)}
      // A keyboard user tabbing back in should get it open again.
      onFocus={() => setShut(false)}
      className={`group/rail fixed inset-y-0 left-0 z-40 hidden w-14 overflow-hidden border-line border-r bg-surface transition-[width,box-shadow] duration-[260ms] ease-out-soft rail:block ${open}`}
    >
      <div className='flex h-full w-[280px] flex-col'>
        <div className='flex h-13 flex-none items-center gap-3 border-line border-b px-2.5'>
          <BrandMark />
          <span className={`font-semibold text-sm tracking-[-0.01em] ${fade}`}>
            {domainsCopy.brand}
          </span>
        </div>

        <div className={`mt-1.5 flex h-[38px] items-center justify-between pr-4 pl-[18px] ${fade}`}>
          <span className='font-medium font-mono text-[9.5px] text-fg-3 uppercase leading-none tracking-[0.12em]'>
            {domainsCopy.sidebar.label}
          </span>
          <span className='font-medium font-mono text-[9.5px] text-fg-3 leading-none tracking-[0.12em]'>
            {claims?.length ?? ''}
          </span>
        </div>

        <div className='flex h-11 items-center px-2.5'>
          <button
            type='button'
            onClick={claimNew}
            className='group/plus flex h-9 w-full items-center gap-3 text-left text-[13px] text-fg-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
          >
            <PlusBox size={36} />
            <span className={fade}>{domainsCopy.sidebar.claim}</span>
          </button>
        </div>

        <ul className='flex-1 overflow-y-auto overflow-x-hidden'>
          {claims?.length === 0 && (
            <li className={`px-[18px] py-2.5 text-[12.5px] text-fg-3 ${fade}`}>
              {domainsCopy.sidebar.empty}
            </li>
          )}
          {claims?.map((claim) => {
            const view = now === null ? null : claimRowView(claim, now);
            const active = pathname === claimPath(claim.id);
            return (
              <li key={claim.id} className={claim.id === added ? 'rail-row-in' : ''}>
                <Link
                  href={claimPath(claim.id)}
                  onClick={blurActive}
                  aria-current={active ? 'page' : undefined}
                  aria-label={view === null ? claim.name : `${claim.name}, ${view.word}`}
                  className={`group/row flex h-12 w-full items-center gap-3 px-2.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 ${active ? 'bg-surface-2' : ''}`}
                >
                  <Favicon badge={view?.badge ?? null} ring={active ? 'surface-2' : 'row'} />
                  <span className={`flex min-w-0 flex-1 flex-col ${fade}`}>
                    <b className='truncate font-medium text-[13px] text-fg'>{claim.name}</b>
                    <span className={`truncate text-[11.5px] ${view ? TONE_TEXT[view.tone] : ''}`}>
                      {view?.word}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Rail;
