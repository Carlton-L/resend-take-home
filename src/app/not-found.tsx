// src/app/not-found.tsx
import Link from 'next/link';
import type React from 'react';
import { appCopy } from '@/lib/copy/app';

/**
 * Rendered for an unmatched route and for any `notFound()` call below it.
 *
 * Points at `/` rather than at the claim screen. `/` already branches on the session, and reading
 * the session here would make an otherwise static page dynamic for nothing.
 */
const NotFound: React.FC = () => {
  return (
    <main
      id='main'
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'
    >
      <h1 className='font-medium text-2xl tracking-tight'>{appCopy.notFound.title}</h1>
      <p className='text-fg-2 leading-relaxed'>{appCopy.notFound.description}</p>
      {/* The claim-belongs-to-another-account case is the one a signed in person actually hits, so
          it gets its own card rather than a clause in the sentence above. */}
      <p className='rounded-lg border border-line bg-surface-2 p-4 text-fg-2 text-sm leading-relaxed'>
        {appCopy.notFound.note}
      </p>
      <Link
        href='/'
        className='self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
      >
        {appCopy.notFound.action}
      </Link>
    </main>
  );
};

export default NotFound;
