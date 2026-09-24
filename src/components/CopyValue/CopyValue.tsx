// src/components/CopyValue/CopyValue.tsx
import type React from 'react';
import ClipboardButton from '@/components/ClipboardButton/ClipboardButton';

type CopyValueProps = {
  value: string;
  label: string;
  /** Amber border, for a value found in DNS that is wrong. */
  tone?: 'plain' | 'warn';
  /** No copy control, for a value to read rather than paste. */
  readOnly?: boolean;
};

/**
 * A value in a field that scrolls sideways, with its copy control inside the border. One line, so
 * a row of them still reads as a row.
 */
const CopyValue: React.FC<CopyValueProps> = ({
  value,
  label,
  tone = 'plain',
  readOnly = false,
}) => (
  <div
    className={`flex h-[38px] min-w-0 items-stretch overflow-hidden rounded-md border bg-surface-2 ${tone === 'warn' ? 'border-warn-edge' : 'border-line-control'}`}
  >
    <code
      // Focusable, so a keyboard can scroll a value longer than its field.
      tabIndex={value.length > 0 ? 0 : undefined}
      className='flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap px-3 font-mono text-[13px] text-fg [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 [&::-webkit-scrollbar]:hidden'
    >
      {value}
    </code>
    {!readOnly && <ClipboardButton value={value} label={label} variant='field' />}
  </div>
);

export default CopyValue;
