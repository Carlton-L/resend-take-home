// src/components/AppHeader/AppHeader.tsx
import Link from 'next/link';
import type React from 'react';
import HeaderMeasure from '@/components/HeaderMeasure/HeaderMeasure';
import HeaderMenu from '@/components/HeaderMenu/HeaderMenu';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';

type AppHeaderProps = {
  email: string | null;
};

/**
 * The address is shown rather than put behind a menu. This product is about which account owns
 * which name, so which account you are signed in as is the first thing a page here should settle.
 *
 * No section link. There is one section, so a link to it would be a slot for siblings that do not
 * exist. The wordmark goes to the list, the two pages under the list carry a back link above
 * their heading, and each h1 says where you are. Two destinations in the bar came before this
 * and were, in turn, two filled buttons, two paths, and two words; each read as more navigation
 * than three screens need.
 *
 * The bar shares the measure of the page under it, which `HeaderMeasure` reads from the path.
 * The address and Sign out live in `HeaderMenu`, which folds them into a popover on a phone.
 */
const AppHeader: React.FC<AppHeaderProps> = ({ email }) => {
  return (
    <header className='border-line border-b'>
      <HeaderMeasure>
        <Link
          href={email === null ? '/' : DEFAULT_SIGNED_IN_PATH}
          className='rounded font-medium text-fg text-sm tracking-tight focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
        >
          DomainClaim
        </Link>

        {email === null ? (
          <Link
            href={SIGN_IN_PATH}
            className='rounded px-1 font-medium text-fg-2 text-sm underline underline-offset-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
          >
            {signInCopy.form.heading}
          </Link>
        ) : (
          <HeaderMenu email={email} />
        )}
      </HeaderMeasure>
    </header>
  );
};

export default AppHeader;
