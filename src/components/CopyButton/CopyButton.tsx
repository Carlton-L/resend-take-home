// src/components/CopyButton/CopyButton.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { claimCopy } from '@/lib/claims/messages';

type CopyButtonProps = {
  value: string;
  /** What is being copied, for the accessible name: "Copy value", "Copy verified.test". */
  describedBy?: string;
  className?: string;
};

const CopyIcon: React.FC = () => (
  <svg viewBox='0 0 16 16' aria-hidden='true' className='size-4' fill='none' strokeWidth='1.5'>
    <rect x='5.5' y='5.5' width='8' height='8' rx='1.75' stroke='currentColor' />
    <path
      d='M10.5 3.5v-.25A1.75 1.75 0 0 0 8.75 1.5h-5.5A1.75 1.75 0 0 0 1.5 3.25v5.5c0 .966.784 1.75 1.75 1.75h.25'
      stroke='currentColor'
      strokeLinecap='round'
    />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox='0 0 16 16' aria-hidden='true' className='size-4' fill='none' strokeWidth='1.75'>
    <path
      d='m3 8.5 3.25 3.25L13 5'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

/**
 * The one clipboard control. `CopyField` puts it inside a field's border and the demo table puts it
 * beside a name, so the icon, the swap to a check and the announcement live here and nowhere else.
 *
 * The icon swap is not announced, so the state change gets a live region of its own.
 */
const CopyButton: React.FC<CopyButtonProps> = ({ value, describedBy, className = '' }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused, and the value is selectable either way.
    }
  };

  return (
    <>
      <button
        type='button'
        onClick={handleCopy}
        aria-label={claimCopy.record.copy}
        aria-describedby={describedBy}
        className={className}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <span aria-live='polite' className='sr-only'>
        {copied ? claimCopy.record.copied : ''}
      </span>
    </>
  );
};

export default CopyButton;
