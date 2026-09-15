// src/components/ClaimStatus/ClaimStatus.tsx
import type React from 'react';
import Notice from '@/components/Notice/Notice';
import StatusPill from '@/components/StatusPill/StatusPill';
import type { ClaimMessage, StatusMessage } from '@/lib/claims/messages';

type ClaimStatusProps = {
  name: string;
  message: StatusMessage | ClaimMessage;
  /** The control that asks again, when there is one. Server rendered callers pass nothing. */
  action?: React.ReactNode;
};

/**
 * The top of the record screen: what state this claim is in, then the name it is about.
 *
 * Takes a message rather than a claim, because two callers build it from different things. The
 * Suspense fallback builds it from the row, which is what the shell can say with no waiting, and
 * the resolved half builds it from the finished check. Same component, two amounts of knowledge.
 */
const ClaimStatus: React.FC<ClaimStatusProps> = ({ name, message, action = null }) => {
  const extra = 'extra' in message ? message.extra : null;

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div className='flex min-w-0 flex-col gap-2'>
        <span className='self-start'>
          <StatusPill label={message.label} tone={message.tone} />
        </span>
        <h1 className='break-all font-medium font-mono text-2xl tracking-tight'>{name}</h1>
        <p className='max-w-2xl text-fg-2 text-sm leading-relaxed'>{message.line}</p>
        {extra !== null &&
          (extra.lead === null ? (
            <p className='max-w-2xl text-fg-2 text-sm leading-relaxed'>{extra.rest}</p>
          ) : (
            <div className='mt-2'>
              <Notice tone='attention'>
                <strong className='font-semibold text-fg'>{extra.lead}</strong> {extra.rest}
              </Notice>
            </div>
          ))}
      </div>
      {action}
    </div>
  );
};

export default ClaimStatus;
