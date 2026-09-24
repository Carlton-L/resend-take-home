// src/components/Pill/Pill.tsx
import type React from 'react';
import type { Tone } from '@/lib/claims/row';

type PillProps = {
  tone: Tone;
  children: React.ReactNode;
  /** A check is running: the dot blinks instead of breathing. */
  busy?: boolean;
  className?: string;
};

const TONE: Record<Tone, string> = {
  good: 'border-signal-edge bg-signal-soft text-signal',
  wait: 'border-wait-edge bg-wait-soft text-wait',
  warn: 'border-warn-edge bg-warn-soft text-warn',
  neutral: 'border-line-control text-fg-3',
};

/** A claim's state. The dot breathes while it waits, so waiting never reads as stuck. */
const Pill: React.FC<PillProps> = ({ tone, children, busy = false, className = '' }) => (
  <span
    className={`inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-medium text-xs leading-none ${TONE[tone]} ${className}`}
  >
    <span
      aria-hidden='true'
      className={`size-1.5 flex-none rounded-full bg-current ${busy ? 'dot-blink' : tone === 'wait' ? 'dot-breathe' : ''}`}
    />
    {children}
  </span>
);

export default Pill;
