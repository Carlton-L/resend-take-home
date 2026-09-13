// src/components/Notice/Notice.tsx
import type React from 'react';

type NoticeProps = {
  children: React.ReactNode;
  /** Attention for something the user has to weigh. Neutral for something they only need to know. */
  tone?: 'neutral' | 'attention';
};

const TONES = {
  neutral: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  attention: 'border-amber-300 bg-amber-50 text-neutral-800',
} as const;

/** One paragraph of context. Not a failure, so it does not use the four-part message shape. */
const Notice: React.FC<NoticeProps> = ({ children, tone = 'neutral' }) => (
  <p className={`rounded-md border p-4 text-sm leading-relaxed ${TONES[tone]}`}>{children}</p>
);

export default Notice;
