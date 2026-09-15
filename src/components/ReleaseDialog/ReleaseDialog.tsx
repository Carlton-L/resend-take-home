// src/components/ReleaseDialog/ReleaseDialog.tsx
'use client';

import type React from 'react';
import { claimCopy } from '@/lib/claims/messages';

type ReleaseDialogProps = {
  id: string;
  name: string;
  host: string;
  /** The caller opens it with `showModal`, so the caller holds the ref. */
  ref: React.Ref<HTMLDialogElement>;
};

/**
 * The confirmation, on its own so the record screen's button and the list's menu open the same
 * one. The confirm is a plain form post, so only opening the dialog needs a script.
 */
const ReleaseDialog: React.FC<ReleaseDialogProps> = ({ id, name, host, ref }) => (
  <dialog
    ref={ref}
    aria-labelledby={`${id}-release-title`}
    className='m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-6 text-fg backdrop:bg-black/70'
  >
    <div className='flex flex-col gap-4'>
      <h2 id={`${id}-release-title`} className='font-medium text-lg tracking-tight'>
        {claimCopy.release.title}
      </h2>
      <p className='text-fg-2 text-sm leading-relaxed'>{claimCopy.release.description(name)}</p>
      <p className='text-fg-2 text-sm leading-relaxed'>{claimCopy.release.removeRecord(host)}</p>
      <div className='flex flex-wrap justify-end gap-2'>
        {/* method='dialog' closes without submitting anything. */}
        <form method='dialog'>
          <button
            type='submit'
            className='rounded-md border border-line-2 bg-surface px-3 py-2 font-medium text-fg text-sm transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
          >
            {claimCopy.release.cancel}
          </button>
        </form>
        <form method='post' action={`/api/claims/${id}/release`}>
          <button
            type='submit'
            className='rounded-md bg-wrong-strong px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-wrong-strong-hover focus-visible:outline-2 focus-visible:outline-wrong-fg focus-visible:outline-offset-2'
          >
            {claimCopy.release.confirm}
          </button>
        </form>
      </div>
    </div>
  </dialog>
);

export default ReleaseDialog;
