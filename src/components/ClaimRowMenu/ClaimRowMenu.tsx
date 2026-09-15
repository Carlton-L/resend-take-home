// src/components/ClaimRowMenu/ClaimRowMenu.tsx
'use client';

import Link from 'next/link';
import type React from 'react';
import { useRef } from 'react';
import ReleaseDialog from '@/components/ReleaseDialog/ReleaseDialog';
import { claimPath } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';
import { useMenu } from '@/lib/hooks/useMenu';

type ClaimRowMenuProps = {
  id: string;
  name: string;
  host: string;
};

const ITEM_CLASS =
  'block w-full rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal';

/**
 * The actions a row has beyond opening it. The row itself stays one link.
 *
 * A plain dropdown rather than the popover attribute, for the reason `useMenu` explains. It closes
 * on Escape, on a click outside, and on focus leaving it. Release opens the same confirmation the
 * record screen uses.
 */
const ClaimRowMenu: React.FC<ClaimRowMenuProps> = ({ id, name, host }) => {
  const { open, triggerRef, menuRef, toggle, close } = useMenu();
  const dialog = useRef<HTMLDialogElement>(null);

  const release = () => {
    close();
    dialog.current?.showModal();
  };

  return (
    <div className='relative'>
      <button
        ref={triggerRef}
        type='button'
        onClick={toggle}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label={claimCopy.list.actions(name)}
        className='flex size-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
      >
        <svg viewBox='0 0 16 16' aria-hidden='true' className='size-4' fill='currentColor'>
          <circle cx='3' cy='8' r='1.5' />
          <circle cx='8' cy='8' r='1.5' />
          <circle cx='13' cy='8' r='1.5' />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role='menu'
          className='absolute top-10 right-0 z-20 w-44 rounded-md border border-line-2 bg-surface p-1 text-fg shadow-black/40 shadow-lg'
        >
          <Link href={claimPath(id)} role='menuitem' className={ITEM_CLASS}>
            {claimCopy.list.open}
          </Link>
          <button
            type='button'
            role='menuitem'
            onClick={release}
            className={`${ITEM_CLASS} text-wrong-fg`}
          >
            {claimCopy.release.trigger}
          </button>
        </div>
      )}
      <ReleaseDialog ref={dialog} id={id} name={name} host={host} />
    </div>
  );
};

export default ClaimRowMenu;
