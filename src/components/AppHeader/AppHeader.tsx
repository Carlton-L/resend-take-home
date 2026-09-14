// src/components/AppHeader/AppHeader.tsx
import Link from 'next/link';
import type React from 'react';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { CLAIM_PATH, DOMAINS_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';

type AppHeaderProps = {
  email: string | null;
};

/**
 * Both navigation controls are drawn as buttons, so they read as things to press rather than as
 * more of the wordmark beside them. Same fill as every other button in the app, so there is one
 * button in this product rather than a header variant of one.
 */
const NAV_CLASS =
  'rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2';

/**
 * The address is shown rather than put behind a menu. This product is about which account owns
 * which name, so which account you are signed in as is the first thing a page here should settle.
 *
 * Two destinations for a signed in account: the list, because a claim is state you come back to
 * from wherever you happen to be, and the claim form, because starting a second claim should not
 * mean going to the list first. The record screen is the one that made that obvious.
 *
 * The wordmark goes to the list as well and that repetition is deliberate. A wordmark is not read
 * as a navigation control, so it cannot be the only way back.
 */
const AppHeader: React.FC<AppHeaderProps> = ({ email }) => {
  return (
    <header className='border-neutral-200 border-b'>
      <div className='mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-3'>
        <div className='flex items-center gap-4'>
          <Link
            href={email === null ? '/' : DEFAULT_SIGNED_IN_PATH}
            className='rounded font-medium text-neutral-900 text-sm tracking-tight focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
          >
            DomainClaim
          </Link>

          {email !== null && (
            <nav className='flex items-center gap-2'>
              <Link href={DOMAINS_PATH} className={NAV_CLASS}>
                {claimCopy.list.nav}
              </Link>
              <Link href={CLAIM_PATH} className={NAV_CLASS}>
                {claimCopy.list.claim}
              </Link>
            </nav>
          )}
        </div>

        {email === null ? (
          <Link
            href={SIGN_IN_PATH}
            className='rounded px-1 font-medium text-neutral-600 text-sm underline underline-offset-4 transition-colors hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
          >
            {signInCopy.form.heading}
          </Link>
        ) : (
          <div className='flex items-center gap-3'>
            <span className='max-w-[40vw] truncate text-neutral-600 text-sm' title={email}>
              {email}
            </span>
            {/* POST, so a prefetch or an image pointing at the route cannot sign anyone out. */}
            <form method='post' action='/api/signout'>
              <button
                type='submit'
                className='rounded px-1 font-medium text-neutral-600 text-sm underline underline-offset-4 transition-colors hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
              >
                {signInCopy.header.signOut}
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
