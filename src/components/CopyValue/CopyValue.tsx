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
  /** Wraps onto more lines rather than scrolling, for a value to compare against another. */
  wrap?: boolean;
};

/**
 * A value in a field that scrolls sideways, with its copy control inside the border. One line, so
 * a row of them still reads as a row. `wrap` shows all of it instead, where it is read against
 * another value.
 */
const CopyValue: React.FC<CopyValueProps> = ({
  value,
  label,
  tone = 'plain',
  readOnly = false,
  wrap = false,
}) => (
  <div
    className={`flex min-w-0 ${wrap ? 'min-h-[38px]' : 'h-[38px]'} items-stretch overflow-hidden rounded-md border bg-surface-2 ${tone === 'warn' ? 'border-warn-edge' : 'border-line-control'}`}
  >
    <code
      // Focusable, so a keyboard can scroll a value longer than its field.
      tabIndex={!wrap && value.length > 0 ? 0 : undefined}
      className={`flex min-w-0 flex-1 items-center px-3 font-mono text-[13px] text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 ${wrap ? 'break-all py-2 leading-relaxed' : 'overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}`}
    >
      {value}
    </code>
    {!readOnly && <ClipboardButton value={value} label={label} variant='field' />}
  </div>
);

export default CopyValue;
