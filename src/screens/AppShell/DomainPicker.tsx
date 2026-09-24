// src/screens/AppShell/DomainPicker.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useClaims } from '@/client/queries';
import { shell } from '@/client/shellStore';
import { useNow } from '@/client/useNow';
import Favicon from '@/components/Favicon/Favicon';
import PlusBox from '@/components/PlusBox/PlusBox';
import { claimPath, DOMAINS_PATH } from '@/lib/claims/config';
import { claimRowView } from '@/lib/claims/row';
import { domainsCopy } from '@/lib/copy/domains';
import { useMenu } from '@/lib/hooks/useMenu';
import { TONE_TEXT } from '@/screens/AppShell/tone';

type DomainPickerProps = {
  currentId: string;
  currentName: string;
};

/**
 * The domain name in the breadcrumb, as a menu of every claim. Phones and touch screens use this
 * instead of the sidebar, and so does every screen when the sidebar is turned off.
 */
const DomainPicker: React.FC<DomainPickerProps> = ({ currentId, currentName }) => {
  const { open, triggerRef, menuRef, toggle, close } = useMenu();
  const { data: claims } = useClaims();
  const now = useNow();
  const router = useRouter();

  const claimNew = () => {
    close();
    shell.focusClaimInput();
    router.push(DOMAINS_PATH);
  };

  return (
    <span className='relative flex min-w-0'>
      <button
        ref={triggerRef}
        type='button'
        onClick={toggle}
        aria-expanded={open}
        aria-label={domainsCopy.picker.open(currentName)}
        className={`-ml-1.5 flex min-w-0 items-center gap-1.5 rounded-[5px] px-1.5 py-1 font-medium font-mono text-[13px] text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2 ${open ? 'bg-surface-2' : ''}`}
      >
        <span className='truncate'>{currentName}</span>
        <svg aria-hidden='true' width='12' height='12' viewBox='0 0 12 12' fill='none'>
          <path
            d='M3 4.5l3 3 3-3'
            stroke='currentColor'
            strokeWidth='1.4'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className='enter-up-fast absolute top-[calc(100%+10px)] -left-2 z-60 w-[280px] max-w-[calc(100vw-24px)] rounded-[7px] border border-line-control bg-surface p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.6)]'
        >
          {(claims ?? []).map((claim) => {
            const view = now === null ? null : claimRowView(claim, now);
            return (
              <Link
                key={claim.id}
                href={claimPath(claim.id)}
                onClick={close}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none ${claim.id === currentId ? 'bg-surface-2' : ''}`}
              >
                <Favicon badge={view?.badge ?? null} size={28} ring='surface-2' />
                <span className='flex min-w-0 flex-col'>
                  <b className='truncate font-medium text-[13px] text-fg'>{claim.name}</b>
                  <span className={`truncate text-[11.5px] ${view ? TONE_TEXT[view.tone] : ''}`}>
                    {view?.word}
                  </span>
                </span>
              </Link>
            );
          })}
          <div className='mx-0.5 my-1.5 h-px bg-line' />
          <button
            type='button'
            onClick={claimNew}
            className='group/plus flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-fg-3 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'
          >
            <PlusBox size={28} />
            {domainsCopy.sidebar.claim}
          </button>
        </div>
      )}
    </span>
  );
};

export default DomainPicker;
