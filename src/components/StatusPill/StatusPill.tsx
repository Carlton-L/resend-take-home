// src/components/StatusPill/StatusPill.tsx
import type React from 'react';
import type { StatusMessage } from '@/lib/claims/messages';

type StatusPillProps = {
  label: string;
  tone: StatusMessage['tone'];
};

const TONES = {
  neutral: 'border-line-2 bg-surface text-fg-2',
  good: 'border-good-line bg-good-bg text-good-fg',
  attention: 'border-attention-line bg-attention-bg text-attention-glyph',
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
