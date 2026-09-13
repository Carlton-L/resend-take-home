// src/app/error.tsx
'use client';

import type React from 'react';
import { appCopy } from '@/lib/copy/app';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The route error boundary. It has to be a client component, because React needs a component that
 * can hold the caught error and re-render after `reset`.
 *
 * The message is deliberately the same whatever threw. The error itself can carry a statement and
 * its parameters, so it stays in the server logs and out of the page. `digest` is the identifier
 * Next puts on both sides, which is what makes a report matchable to a log line.
 */
const ErrorPage: React.FC<ErrorPageProps> = ({ error, reset }) => {
  return (
    <main className='mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'>
      <h1 className='font-medium text-2xl tracking-tight'>{appCopy.unexpected.title}</h1>
      <p className='text-neutral-600 leading-relaxed'>{appCopy.unexpected.description}</p>
      {error.digest !== undefined && (
        <p className='font-mono text-neutral-500 text-sm'>{error.digest}</p>
      )}
      <button
        type='button'
        onClick={reset}
        className='self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
      >
        {appCopy.unexpected.action}
      </button>
    </main>
  );
};

export default ErrorPage;
