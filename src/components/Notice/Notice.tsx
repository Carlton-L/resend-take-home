// src/components/Notice/Notice.tsx
import type React from 'react';

type NoticeProps = {
  children: React.ReactNode;
  /** Attention for something the user has to weigh. Neutral for something they only need to know. */
  tone?: 'neutral' | 'attention';
};

const TONES = {
  neutral: 'border-line bg-surface-2 text-fg-2',
  attention: 'border-attention-line bg-attention-bg text-attention-fg',
} as const;

/** One paragraph of context. Not a failure, so it does not use the four-part message shape. */
const Notice: React.FC<NoticeProps> = ({ children, tone = 'neutral' }) => (
  <div className={`rounded-lg border p-4 text-sm leading-relaxed ${TONES[tone]}`}>
    {/* The box spans the page so it lines up with the cards. The line does not. */}
    <p className='max-w-2xl'>{children}</p>
  </div>
);

export default Notice;
