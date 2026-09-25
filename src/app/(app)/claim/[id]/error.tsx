// src/app/(app)/claim/[id]/error.tsx
'use client';

import Link from 'next/link';
import type React from 'react';
import { DOMAINS_PATH } from '@/lib/claims/config';
import { appCopy } from '@/lib/copy/app';
import { claimScreenCopy } from '@/lib/copy/claim';
import { BUTTON } from '@/screens/ClaimScreen/buttons';

type ClaimErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * A throw on the claim screen. It renders inside the app shell, so the top bar and the sidebar
 * stay, and it keeps the way back to the list beside the retry. The root boundary speaks for the
 * whole app and has neither.
 */
const ClaimError: React.FC<ClaimErrorProps> = ({ error, reset }) => {
  const copy = appCopy.claimFailed;
  return (
    <div className='page-wrap pt-[92px] max-[720px]:pt-7'>
      <h1 className='mb-2 font-semibold text-[26px]'>{copy.title}</h1>
      <p className='mb-5 text-fg-3'>{copy.description}</p>
      {error.digest !== undefined && (
        <p className='mb-5 font-mono text-[12px] text-fg-5'>{error.digest}</p>
      )}
      <div className='flex flex-wrap items-center gap-2.5'>
        <button type='button' onClick={reset} className={BUTTON.primary}>
          {copy.action}
        </button>
        <Link href={DOMAINS_PATH} className={BUTTON.regular}>
          {claimScreenCopy.verified.back}
        </Link>
      </div>
    </div>
  );
};

export default ClaimError;
