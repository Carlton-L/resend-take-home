// src/components/CopyField/CopyField.tsx
'use client';

import type React from 'react';
import { useId } from 'react';
import CopyButton from '@/components/CopyButton/CopyButton';

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

const CopyField: React.FC<CopyFieldProps> = ({
  label,
  value,
  hint,
  labelHidden = false,
  className = '',
  wrap = false,
}) => {
  const labelId = useId();

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span
        id={labelId}
        className={
          labelHidden ? 'sr-only' : 'font-medium text-fg-3 text-xs uppercase tracking-wider'
        }
      >
        {label}
      </span>

      <div className='flex w-full items-stretch overflow-hidden rounded-md border border-line bg-surface-2'>
        {/*
          A scrolling value is focusable so the arrow keys can move it, since the scrollbar is
          hidden. A wrapped one has nothing to scroll and stays out of the tab order.
        */}
        <code
          title={value}
          tabIndex={wrap ? undefined : 0}
          className={`min-w-0 flex-1 px-3 py-2 font-mono text-fg text-sm ${
            wrap
              ? 'break-all'
              : 'overflow-x-auto whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }`}
        >
          {value}
        </code>
        <CopyButton
          value={value}
          describedBy={labelId}
          className='flex shrink-0 items-center border-line border-l px-2.5 text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal'
        />
      </div>

      {/* A div rather than a paragraph, because a hint can carry a disclosure and a `details`
          inside a `p` is closed by the parser before it renders. */}
      {hint !== undefined && <div className='text-fg-2 text-sm leading-relaxed'>{hint}</div>}
    </div>
  );
};

export default CopyField;
