// src/app/auth/link-expired/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';

export const metadata: Metadata = {
  title: 'Link expired',
  robots: { index: false, follow: false },
};

/**
 * One screen for expired, already used, and followed by a scanner. The product cannot tell those
 * apart from a refused token, and the next step is the same for all three, so naming a cause would
 * mean guessing at one.
 */
const LinkExpiredPage: React.FC = () => {
  return (
    <main
      id='main'
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'
    >
      {/* The page keeps the app's measure. A one field form does not, so it is capped inside it. */}
      <div className='flex max-w-md flex-col gap-6'>
        <h1 className='font-medium text-2xl tracking-tight'>{signInCopy.dead.title}</h1>
        <p className='text-fg-2 leading-relaxed'>{signInCopy.dead.description}</p>
        <Link
          href={SIGN_IN_PATH}
          className='w-fit rounded-md bg-primary px-4 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
        >
          {signInCopy.dead.action}
        </Link>
      </div>
    </main>
  );
};

export default LinkExpiredPage;
