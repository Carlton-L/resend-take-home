// src/screens/ClaimScreen/ReleaseDialog.tsx
'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { claimCopy } from '@/lib/claims/messages';
import { BUTTON } from '@/screens/ClaimScreen/buttons';

type ReleaseDialogProps = {
  open: boolean;
  name: string;
  fullName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

/**
 * The native dialog, so focus is trapped and returned and Escape closes it without hand-built
 * handling. It names the record to delete, since releasing leaves it in the zone.
 */
const ReleaseDialog: React.FC<ReleaseDialogProps> = ({
  open,
  name,
  fullName,
  onCancel,
  onConfirm,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const copy = claimCopy.release;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby='release-title'
      className='m-auto w-[min(440px,calc(100%-32px))] rounded-[10px] border border-line-control bg-surface px-6 py-[22px] text-fg shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop:bg-[rgb(5_5_6/0.6)] backdrop:backdrop-blur-[2px]'
    >
      <h2 id='release-title' className='mb-2 font-semibold text-[17px]'>
        {copy.title}
      </h2>
      <p className='mb-2.5 text-[13.5px] text-fg-3 leading-normal'>{copy.description(name)}</p>
      <p className='mb-2.5 text-[13.5px] text-fg leading-normal'>{copy.removeRecord(fullName)}</p>
      <div className='mt-4 flex justify-end gap-2'>
        <button type='button' onClick={onCancel} className={BUTTON.regular}>
          {copy.cancel}
        </button>
        <button type='button' onClick={confirm} disabled={busy} className={BUTTON.danger}>
          {copy.confirm}
        </button>
      </div>
    </dialog>
  );
};

export default ReleaseDialog;
