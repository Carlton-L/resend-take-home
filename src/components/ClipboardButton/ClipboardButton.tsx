// src/components/ClipboardButton/ClipboardButton.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { claimCopy } from '@/lib/claims/messages';

type ClipboardButtonProps = {
  value: string;
  /** What is being copied, for the button's name: "Copy Value". */
  label: string;
  /** Icon inside a field, or a small text button. */
  variant: 'field' | 'button';
  /** Text on the button variant. */
  text?: string;
};

const CopyIcon: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 16 16'
    width='15'
    height='15'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
  >
    <rect x='5.5' y='5.5' width='8' height='8' rx='1.75' />
    <path
      d='M10.5 3.5v-.25A1.75 1.75 0 0 0 8.75 1.5h-5.5A1.75 1.75 0 0 0 1.5 3.25v5.5c0 .97.78 1.75 1.75 1.75h.25'
      strokeLinecap='round'
    />
  </svg>
);

/**
 * Copies a value and says "Copied" for two seconds. Words, never a tick: a tick next to a record
 * reads as the record being verified.
 */
const ClipboardButton: React.FC<ClipboardButtonProps> = ({ value, label, variant, text }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused. The value is selectable either way.
    }
  };

  const name = `${claimCopy.record.copy} ${label}`;
  if (variant === 'field') {
    return (
      <button
        type='button'
        onClick={copy}
        aria-label={name}
        className={`grid min-w-10 flex-none place-items-center border-line-control border-l px-2.5 text-[11.5px] transition-colors hover:bg-bg hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 ${copied ? 'text-fg' : 'text-fg-3'}`}
      >
        {copied ? claimCopy.record.copied : <CopyIcon />}
        <span aria-live='polite' className='sr-only'>
          {copied ? claimCopy.record.copied : ''}
        </span>
      </button>
    );
  }
  return (
    <button
      type='button'
      onClick={copy}
      aria-label={name}
      className={`inline-flex h-7 min-w-16 items-center justify-center rounded-[7px] border px-2.5 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2 ${copied ? 'border-wait-edge bg-wait-soft text-wait' : 'border-line-control bg-surface-2 text-fg hover:border-[#36363b] hover:bg-surface-3'}`}
    >
      {copied ? claimCopy.record.copied : (text ?? claimCopy.record.copy)}
      <span aria-live='polite' className='sr-only'>
        {copied ? claimCopy.record.copied : ''}
      </span>
    </button>
  );
};

export default ClipboardButton;
