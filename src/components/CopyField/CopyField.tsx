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
  /**
   * Keeps the label for assistive technology and takes it off the screen. Used where the cell
   * already carries a visible label above it and a second one would read as a second field.
   */
  labelHidden?: boolean;
  /**
   * Width of the cell. The field fills it, and so does the hint, which is what keeps a long hint
   * from deciding how wide the cell is.
   */
  className?: string;
  /**
   * Let the value wrap onto more lines instead of scrolling sideways. For a field outside the row,
   * where nothing has to line up and seeing the whole value matters more than the height.
   */
  wrap?: boolean;
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
 * One cell of the record: a label, the value, and a control that copies it.
 *
 * The control sits inside the field's border rather than beside it, because two boxes with a gap
 * between them do not say which button belongs to which value once there are four cells in a row.
 *
 * The value is rendered as its own expression with no whitespace around it inside the element, so
 * what the user selects by hand is the same string the button copies. A DNS panel that receives a
 * leading space stores the leading space.
 *
 * The field is one line and scrolls sideways rather than wrapping. A record value is 78 bytes and
 * wrapping it makes every cell in the row a different height, which stops the row reading as a row.
 * The whole value is in the DOM either way, so the copy and a hand selection are unaffected, and
 * the visible part is the start, which is the half that identifies it.
 *
 * The width lives on the cell rather than on the field. A hint is often longer than its value, so a
 * cell sized by its content is sized by its hint, and the row wraps.
 */
const CopyField: React.FC<CopyFieldProps> = ({
  label,
  value,
  hint,
  labelHidden = false,
  className = '',
  wrap = false,
}) => {
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
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span
        id={labelId}
        className={
          labelHidden ? 'sr-only' : 'font-medium text-neutral-500 text-xs uppercase tracking-wider'
        }
      >
        {label}
      </span>

      <div className='flex w-full items-stretch overflow-hidden rounded-md border border-neutral-200 bg-neutral-50'>
        <code
          title={value}
          className={`min-w-0 flex-1 px-3 py-2 font-mono text-neutral-900 text-sm ${
            wrap
              ? 'break-all'
              : 'overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }`}
        >
          {value}
        </code>
        <button
          type='button'
          onClick={handleCopy}
          aria-label={claimCopy.record.copy}
          aria-describedby={labelId}
          className='flex shrink-0 items-center border-neutral-200 border-l px-2.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:-outline-offset-2'
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* A div rather than a paragraph, because a hint can carry a disclosure and a `details`
          inside a `p` is closed by the parser before it renders. */}
      {hint !== undefined && <div className='text-neutral-600 text-sm leading-relaxed'>{hint}</div>}

      {/* The icon swap is not announced, so the state change gets a live region of its own. */}
      <span aria-live='polite' className='sr-only'>
        {copied ? claimCopy.record.copied : ''}
      </span>
    </div>
  );
};

export default CopyField;
