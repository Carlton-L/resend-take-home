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
    <main className='mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'>
      <h1 className='font-medium text-2xl tracking-tight'>{appCopy.notFound.title}</h1>
      <p className='text-neutral-600 leading-relaxed'>{appCopy.notFound.description}</p>
      <Link
        href='/'
        className='self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
      >
        {appCopy.notFound.action}
      </Link>
    </main>
  );
};

export default NotFound;
