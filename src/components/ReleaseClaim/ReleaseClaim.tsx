// src/components/ReleaseClaim/ReleaseClaim.tsx
'use client';

import type React from 'react';
import { useRef } from 'react';
import { claimCopy } from '@/lib/claims/messages';

type ReleaseClaimProps = {
  id: string;
  name: string;
  /** The record the user has to take out of their zone themselves. */
  host: string;
};

/**
 * Giving up a claim.
 *
 * The native `dialog` element, so the modal behaviour, focus trapping and Escape all come from the
 * browser rather than from a component library. Confirming is a real form post, so the destructive
 * action needs no client JavaScript of its own once the dialog is open.
 */
const ReleaseClaim: React.FC<ReleaseClaimProps> = ({ id, name, host }) => {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type='button'
        onClick={() => dialog.current?.showModal()}
        className='self-start rounded-md border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-700 text-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
      >
        {claimCopy.release.trigger}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`${id}-release-title`}
        className='m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border border-neutral-200 bg-white p-6 text-neutral-900 backdrop:bg-neutral-900/40'
      >
        <div className='flex flex-col gap-4'>
          <h2 id={`${id}-release-title`} className='font-medium text-lg tracking-tight'>
            {claimCopy.release.title}
          </h2>
          <p className='text-neutral-700 text-sm leading-relaxed'>
            {claimCopy.release.description(name)}
          </p>
          <p className='text-neutral-700 text-sm leading-relaxed'>
            {claimCopy.release.removeRecord(host)}
          </p>

          <div className='flex flex-wrap justify-end gap-2'>
            {/* method='dialog' closes without submitting anything. */}
            <form method='dialog'>
              <button
                type='submit'
                className='rounded-md border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-900 text-sm transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
              >
                {claimCopy.release.cancel}
              </button>
            </form>

            <form method='post' action={`/api/claims/${id}/release`}>
              <button
                type='submit'
                className='rounded-md bg-red-700 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 focus-visible:outline-offset-2'
              >
                {claimCopy.release.confirm}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default ReleaseClaim;
