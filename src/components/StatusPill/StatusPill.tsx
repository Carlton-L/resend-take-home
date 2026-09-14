// src/components/StatusPill/StatusPill.tsx
import type React from 'react';
import type { StatusMessage } from '@/lib/claims/messages';

type StatusPillProps = {
  label: string;
  tone: StatusMessage['tone'];
};

const TONES = {
  neutral: 'border-neutral-300 bg-white text-neutral-600',
  good: 'border-green-300 bg-green-50 text-green-700',
  attention: 'border-amber-300 bg-amber-50 text-neutral-800',
} as const;

/**
 * The claim's state, in one word.
 *
 * One component for the record screen and the list, so a claim reads the same in both places. The
 * tone carries the only marker either screen puts on a claim: attention means the next move is the
 * person's.
 */
const StatusPill: React.FC<StatusPillProps> = ({ label, tone }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-wider ${TONES[tone]}`}
  >
    <span aria-hidden='true' className='size-1.5 rounded-full bg-current' />
    {label}
  </span>
);

export default StatusPill;
