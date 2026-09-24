// src/screens/ClaimScreen/OutArrow.tsx
import type React from 'react';
import { OUT_ARROW_PATH } from '@/screens/ClaimScreen/buttons';

/** The arrow after a link that opens another site. */
const OutArrow: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 16 16'
    width='12'
    height='12'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.4'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d={OUT_ARROW_PATH} />
  </svg>
);

export default OutArrow;
