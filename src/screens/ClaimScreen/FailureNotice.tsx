// src/screens/ClaimScreen/FailureNotice.tsx
import type React from 'react';
import CopyValue from '@/components/CopyValue/CopyValue';
import { splitAtDifference } from '@/lib/claims/difference';
import type { FailureMessage } from '@/lib/claims/messages';
import Notice from '@/screens/ClaimScreen/Notice';

type FailureNoticeProps = {
  message: FailureMessage;
  tone: 'wait' | 'warn';
  /** Buttons after the action: Check now, Open DNS, Find your registrar. */
  actions?: React.ReactNode;
  className?: string;
};

/** A found value with the part that differs from what it should be marked in amber. */
const Marked: React.FC<{ value: string; against: string | undefined }> = ({ value, against }) => {
  if (against === undefined) {
    return <>{value}</>;
  }
  const { same, rest } = splitAtDifference(value, against);
  return (
    <>
      {same}
      {rest.length > 0 && <mark className='rounded-[3px] bg-warn/15 px-px text-warn'>{rest}</mark>}
    </>
  );
};

/** One failure in its four parts: title, what was found, why, and the one thing to do next. */
const FailureNotice: React.FC<FailureNoticeProps> = ({ message, tone, actions, className }) => (
  <Notice tone={tone} title={message.title} className={className}>
    {message.record !== null && (
      <div className='mt-3 mb-3 grid gap-1.5'>
        <span className='font-medium font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.12em]'>
          {message.record.label}
        </span>
        {message.record.values.map((value) => (
          <code key={value} className='break-all font-mono text-[12.5px] text-fg leading-relaxed'>
            <Marked value={value} against={message.record?.against} />
          </code>
        ))}
      </div>
    )}
    <p className='mb-2.5 max-w-[720px] text-[13px] text-fg-3'>{message.description}</p>
    {message.copyable !== null && (
      <div className='mb-3 grid max-w-[560px] gap-1.5'>
        <span className='font-medium font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.12em]'>
          {message.copyable.label}
        </span>
        <CopyValue value={message.copyable.value} label={message.copyable.label} wrap />
      </div>
    )}
    <div className='flex flex-wrap items-center gap-2.5'>
      <p className='min-w-60 flex-1 text-[13px] text-fg'>{message.action}</p>
      {actions}
    </div>
  </Notice>
);

export default FailureNotice;
