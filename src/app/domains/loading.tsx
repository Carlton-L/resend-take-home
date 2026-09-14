// src/app/domains/loading.tsx
import type React from 'react';
import Skeleton from '@/components/Skeleton/Skeleton';
import { claimCopy } from '@/lib/claims/messages';

/**
 * What this route shows from the moment a navigation to it starts.
 *
 * App Router specific: a `loading.tsx` wraps its segment in a Suspense boundary and React renders
 * this as the fallback the instant the navigation begins, without waiting for the server. Without
 * one, the browser stays on the previous page until the new one starts streaming, and a click
 * looks like nothing happened. This page is `force-dynamic` and reads the session and the
 * account's claims before it can send anything, so that gap is long enough to notice.
 *
 * The shape matches the page underneath it, so the real content replaces this rather than
 * displacing it.
 */
const Loading: React.FC = () => (
  <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'>
    <div role='status' className='flex flex-col gap-8'>
      <span className='sr-only'>{claimCopy.loading.list}</span>

      <div className='flex flex-col gap-3'>
        <Skeleton className='h-7 w-40' />
        <Skeleton className='h-4 w-full max-w-md' />
      </div>

      <div className='flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200'>
        {[0, 1, 2].map((row) => (
          <div key={row} className='flex items-center justify-between gap-4 px-5 py-4'>
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-5 w-20 rounded-full' />
          </div>
        ))}
      </div>
    </div>
  </main>
);

export default Loading;
