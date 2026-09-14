// src/components/ClaimStatus/ClaimStatus.tsx
import type React from 'react';
import type { ClaimMessage, StatusMessage } from '@/lib/claims/messages';

type ClaimStatusProps = {
  name: string;
  message: StatusMessage | ClaimMessage;
};

const TONES = {
  neutral: 'border-neutral-300 bg-white text-neutral-600',
  good: 'border-green-300 bg-green-50 text-green-700',
  attention: 'border-amber-300 bg-amber-50 text-neutral-800',
} as const;

/**
 * The top of the record screen: what state this claim is in, then the name it is about.
 *
 * Takes a message rather than a claim, because two callers build it from different things. The
 * Suspense fallback builds it from the row, which is what the shell can say with no waiting, and
 * the resolved half builds it from the finished check. Same component, two amounts of knowledge.
 */
const ClaimStatus: React.FC<ClaimStatusProps> = ({ name, message }) => {
  const extra = 'extra' in message ? message.extra : null;

  return (
    <div className='flex flex-col gap-2'>
      <span
        className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-wider ${TONES[message.tone]}`}
      >
        <span aria-hidden='true' className='size-1.5 rounded-full bg-current' />
        {message.label}
      </span>
      <h1 className='break-all font-medium font-mono text-2xl tracking-tight'>{name}</h1>
      <p className='max-w-2xl text-neutral-600 text-sm leading-relaxed'>{message.line}</p>
      {extra !== null && (
        <p className='max-w-2xl text-neutral-600 text-sm leading-relaxed'>{extra}</p>
      )}
    </div>
  );
};

export default ClaimStatus;
