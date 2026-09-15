// src/components/HeaderMenu/HeaderMenu.tsx
'use client';

import type React from 'react';
import { signInCopy } from '@/lib/auth/messages';
import { useMenu } from '@/lib/hooks/useMenu';

type HeaderMenuProps = {
  email: string;
};

const SIGN_OUT_CLASS =
  'rounded px-1 font-medium text-fg-2 text-sm underline underline-offset-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';

/**
 * The account, in two arrangements. From `sm` up the address and Sign out sit in the bar. Below
 * that they fold behind an account button, since the bar wrapped to a second line on a phone. The
 * two nav paths stay in the bar at every size; they are short enough.
 *
 * Sign out is a form post in both places, so a prefetch cannot sign anyone out from either.
 */
const HeaderMenu: React.FC<HeaderMenuProps> = ({ email }) => {
  const { open, triggerRef, menuRef, toggle } = useMenu();

  const signOut = (
    <form method='post' action='/api/signout'>
      <button type='submit' className={SIGN_OUT_CLASS}>
        {signInCopy.header.signOut}
      </button>
    </form>
  );

  return (
    <>
      <div className='hidden items-center gap-3 sm:flex'>
        <span className='max-w-[40vw] truncate text-fg-2 text-sm' title={email}>
          {email}
        </span>
        {signOut}
      </div>

      <div className='relative sm:hidden'>
        <button
          ref={triggerRef}
          type='button'
          onClick={toggle}
          aria-expanded={open}
          aria-label={signInCopy.header.account}
          className='flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
        >
          <svg
            viewBox='0 0 16 16'
            aria-hidden='true'
            className='size-4'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
          >
            <circle cx='8' cy='5.5' r='2.75' />
            <path d='M2.75 14a5.25 5.25 0 0 1 10.5 0' />
          </svg>
        </button>
        {open && (
          <div
            ref={menuRef}
            className='absolute top-10 right-0 z-20 flex w-64 flex-col items-start gap-2 rounded-lg border border-line-2 bg-surface p-4 text-fg shadow-black/40 shadow-lg'
          >
            <span className='max-w-full truncate text-fg-2 text-sm' title={email}>
              {email}
            </span>
            {signOut}
          </div>
        )}
      </div>
    </>
  );
};

export default HeaderMenu;
