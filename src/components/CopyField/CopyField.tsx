// src/components/CopyField/CopyField.tsx
'use client';

import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { claimCopy } from '@/lib/claims/messages';

type CopyFieldProps = {
  label: string;
  /** Copied exactly as given. Nothing is trimmed or added on the way to the clipboard. */
  value: string;
  hint?: React.ReactNode;
};

/**
 * One row of the record: a label, the value, and a control that copies it.
 *
 * The value is rendered as its own expression with no whitespace around it inside the element, so
 * what the user selects by hand is the same string the button copies. A DNS panel that receives a
 * leading space stores the leading space.
 */
const CopyField: React.FC<CopyFieldProps> = ({ label, value, hint }) => {
  const labelId = useId();
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
    <div className='flex flex-col gap-1.5'>
      <span id={labelId} className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
        {label}
      </span>
      <div className='flex w-full min-w-0 items-start gap-2'>
        <code className='min-w-0 flex-1 break-all rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-neutral-900 text-sm'>
          {value}
        </code>
        <button
          type='button'
          onClick={handleCopy}
          aria-describedby={labelId}
          className='shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-900 text-sm transition-colors hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
        >
          {copied ? claimCopy.record.copied : claimCopy.record.copy}
        </button>
      </div>
      {hint !== undefined && <p className='text-neutral-600 text-sm leading-relaxed'>{hint}</p>}
      {/* Announced separately, because the button's own label changing is not reliably read. */}
      <span aria-live='polite' className='sr-only'>
        {copied ? claimCopy.record.copied : ''}
      </span>
    </div>
  );
};

export default CopyField;
