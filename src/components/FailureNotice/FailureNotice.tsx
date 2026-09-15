// src/components/FailureNotice/FailureNotice.tsx
import type React from 'react';
import type { FailureMessage } from '@/lib/claims/messages';

type FailureNoticeProps = {
  message: FailureMessage;
  /**
   * Neutral for a state that is expected rather than wrong. The first check on a new claim always
   * misses, because the user has not added the record yet, and colouring that as a fault would
   * report the product working as a problem.
   */
  tone: 'neutral' | 'attention';
};

const TONES = {
  neutral: 'border-line bg-surface-2',
  attention: 'border-attention-line bg-attention-bg',
} as const;

/**
 * A failure in the four parts every message in this product uses: what went wrong, the DNS value
 * it went wrong on, why, and the one thing to do next.
 */
const FailureNotice: React.FC<FailureNoticeProps> = ({ message, tone }) => {
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-5 ${TONES[tone]}`}>
      <h3 className='font-medium text-fg'>{message.title}</h3>

      {message.record !== null && (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-fg-3 text-xs uppercase tracking-wider'>
            {message.record.label}
          </span>
          <ul className='flex flex-col gap-1'>
            {message.record.values.map((value) => (
              <li key={value} className='break-all font-mono text-fg text-sm'>
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className='max-w-2xl font-medium text-fg text-sm leading-relaxed'>{message.action}</p>
      <p className='max-w-2xl text-fg-2 text-sm leading-relaxed'>{message.description}</p>
    </div>
  );
};

export default FailureNotice;
