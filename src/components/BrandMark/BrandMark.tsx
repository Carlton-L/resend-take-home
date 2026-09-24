// src/components/BrandMark/BrandMark.tsx
import type React from 'react';

/** Two ports joined by a cable. */
const BrandMark: React.FC = () => (
  <span
    aria-hidden='true'
    className='grid size-9 flex-none place-items-center rounded-[7px] border border-line-control bg-surface-2'
  >
    <svg aria-hidden='true' width='18' height='18' viewBox='0 0 18 18' fill='none'>
      <path d='M4 9h10' stroke='#3dff88' strokeWidth='1.5' />
      <circle cx='4' cy='9' r='2.6' fill='#0a0a0b' stroke='#3dff88' strokeWidth='1.5' />
      <circle cx='14' cy='9' r='2.6' fill='#3dff88' />
    </svg>
  </span>
);

export default BrandMark;
