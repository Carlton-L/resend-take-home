// src/app/claim/error.tsx
'use client';

import type React from 'react';
import BackLink from '@/components/BackLink/BackLink';
import { appCopy } from '@/lib/copy/app';

type ClaimErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The boundary for the claim form and the record screen. Both render from the session and the
 * database, and a throw in either used to fall through to the root boundary, which speaks for the
 * whole app. This one keeps the way back to the list and retries only this segment.
 *
 * The check itself cannot land here: every DNS failure is a return value the chain renders.
 */
const ClaimError: React.FC<ClaimErrorProps> = ({ error, reset }) => {
  return (
    <main
      id='main'
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'
    >
      <BackLink />
      <div className='flex flex-col gap-4'>
        <h1 className='font-medium text-2xl tracking-tight'>{appCopy.claimFailed.title}</h1>
        <p className='text-fg-2 leading-relaxed'>{appCopy.claimFailed.description}</p>
        {error.digest !== undefined && (
          <p className='font-mono text-fg-3 text-sm'>{error.digest}</p>
        )}
        <button
          type='button'
          onClick={reset}
          className='self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
        >
          {appCopy.claimFailed.action}
        </button>
      </div>
    </main>
  );
};

export default ClaimError;
