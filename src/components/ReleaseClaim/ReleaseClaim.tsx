// src/components/ReleaseClaim/ReleaseClaim.tsx
'use client';

import type React from 'react';
import { useRef } from 'react';
import ReleaseDialog from '@/components/ReleaseDialog/ReleaseDialog';
import { claimCopy } from '@/lib/claims/messages';

type ReleaseClaimProps = {
  id: string;
  name: string;
  host: string;
};

/**
 * The record screen's way out: a quiet button at the foot, and the shared confirmation.
 */
const ReleaseClaim: React.FC<ReleaseClaimProps> = ({ id, name, host }) => {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type='button'
        onClick={() => dialog.current?.showModal()}
        className='self-start rounded-md border border-line-2 bg-surface px-3 py-2 font-medium text-fg-2 text-sm transition-colors hover:border-wrong-line hover:bg-wrong-bg hover:text-wrong-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
      >
        {claimCopy.release.trigger}
      </button>
      <ReleaseDialog ref={dialog} id={id} name={name} host={host} />
    </>
  );
};

export default ReleaseClaim;
