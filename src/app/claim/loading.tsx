// src/app/claim/loading.tsx
import type React from 'react';
import BackLink from '@/components/BackLink/BackLink';
import Skeleton from '@/components/Skeleton/Skeleton';
import { claimCopy } from '@/lib/claims/messages';

/** The claim form, while the session is being read. See `src/app/domains/loading.tsx`. */
const Loading: React.FC = () => (
  <main
    id='main'
    className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'
  >
    {/* Static, so it renders in the skeleton too and nothing shifts when the page lands. */}
    <BackLink />
    <div role='status' className='flex flex-col gap-8'>
      <span className='sr-only'>{claimCopy.loading.claim}</span>

      <div className='flex flex-col gap-3'>
        <Skeleton className='h-7 w-52' />
        <Skeleton className='h-4 w-full' />
      </div>

      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-16' />
        <Skeleton className='h-10 w-full' />
      </div>

      <Skeleton className='h-40 w-full rounded-md' />
    </div>
  </main>
);

export default Loading;
