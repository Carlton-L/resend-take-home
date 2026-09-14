// src/app/claim/[id]/loading.tsx
import type React from 'react';
import Skeleton from '@/components/Skeleton/Skeleton';
import { claimCopy } from '@/lib/claims/messages';

/**
 * The record screen, before its shell arrives. See `src/app/domains/loading.tsx` for what a
 * `loading.tsx` does.
 *
 * This route needs it most. The shell reads the session and the claim row before it can send
 * anything, and the check streams in behind that, so a click from the list used to sit on the old
 * page with nothing said.
 */
const Loading: React.FC = () => (
  <main className='mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16 sm:py-24'>
    <div role='status' className='flex flex-col gap-6'>
      <span className='sr-only'>{claimCopy.loading.record}</span>

      <div className='flex flex-col gap-3'>
        <Skeleton className='h-5 w-24 rounded-full' />
        <Skeleton className='h-8 w-64' />
      </div>

      <Skeleton className='h-12 w-full max-w-2xl rounded-md' />
      <Skeleton className='h-64 w-full rounded-md' />
    </div>
  </main>
);

export default Loading;
