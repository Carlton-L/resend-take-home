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
  neutral: 'border-neutral-200 bg-neutral-50',
  attention: 'border-amber-300 bg-amber-50',
} as const;

/**
 * A failure in the four parts every message in this product uses: what went wrong, the DNS value
 * it went wrong on, why, and the one thing to do next.
 */
const FailureNotice: React.FC<FailureNoticeProps> = ({ message, tone }) => {
  return (
    <div className={`flex flex-col gap-3 rounded-md border p-5 ${TONES[tone]}`}>
      <h3 className='font-medium text-neutral-900'>{message.title}</h3>

      {message.record !== null && (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
            {message.record.label}
          </span>
          <ul className='flex flex-col gap-1'>
            {message.record.values.map((value) => (
              <li key={value} className='break-all font-mono text-neutral-900 text-sm'>
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className='text-neutral-700 text-sm leading-relaxed'>{message.description}</p>
      <p className='font-medium text-neutral-900 text-sm leading-relaxed'>{message.action}</p>
    </div>
  );
};

export default FailureNotice;
