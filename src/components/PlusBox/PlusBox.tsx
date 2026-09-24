// src/components/PlusBox/PlusBox.tsx
import type React from 'react';

type PlusBoxProps = {
  size: 28 | 36;
};

/** The dashed square with a plus, used by every Claim a domain entry. */
const PlusBox: React.FC<PlusBoxProps> = ({ size }) => (
  <span
    aria-hidden='true'
    className={`grid flex-none place-items-center border border-line-2 border-dashed text-fg-3 transition-colors group-hover/plus:border-signal/50 group-hover/plus:text-signal ${size === 36 ? 'size-9 rounded-[7px]' : 'size-7 rounded-md'}`}
  >
    <svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14' fill='none'>
      <path d='M7 2v10M2 7h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  </span>
);

export default PlusBox;
