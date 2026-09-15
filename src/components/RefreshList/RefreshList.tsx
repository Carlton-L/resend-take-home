// src/components/RefreshList/RefreshList.tsx
'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useTransition } from 'react';
import { claimCopy } from '@/lib/claims/messages';

const RefreshIcon: React.FC = () => (
  <svg
    viewBox='0 0 16 16'
    aria-hidden='true'
    className='size-3.5'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3' />
  </svg>
);

/**
 * Re-reads the list. It runs no check: the list never asks DNS anything, and the only thing that
 * moves a claim is the check the record screen runs. What this reflects is a release made in
 * another tab, or a claim that a record screen verified since this page loaded.
 */
const RefreshList: React.FC = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type='button'
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className='inline-flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-1.5 font-medium text-fg-2 text-sm transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-fg-4'
    >
      <RefreshIcon />
      {pending ? claimCopy.list.refreshing : claimCopy.list.refresh}
    </button>
  );
};

export default RefreshList;
