// src/screens/ClaimScreen/FailureNotice.tsx
import type React from 'react';
import CopyValue from '@/components/CopyValue/CopyValue';
import { splitAtDifference } from '@/lib/claims/difference';
import type { FailureMessage } from '@/lib/claims/messages';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import Notice from '@/screens/ClaimScreen/Notice';
import OutArrow from '@/screens/ClaimScreen/OutArrow';

type FailureNoticeProps = {
  message: FailureMessage;
  tone: 'wait' | 'warn';
  /** Buttons under the message: Check now, Find your registrar, Get a new record. */
  actions?: React.ReactNode;
  /** The DNS panel, when the host is one we link to. Beside the value to paste there. */
  panel?: { url: string; label: string } | null;
  className?: string;
};

const PanelLink: React.FC<{ url: string; label: string }> = ({ url, label }) => (
  <a href={url} target='_blank' rel='noopener noreferrer' className={`${BUTTON.small} flex-none`}>
    {label}
    <OutArrow />
  </a>
);

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

/**
 * One failure in its four parts: title, what was found, the one thing to do next, and why. The
 * action comes before the reason, with the value to paste between them, so it reads as
 * instruction, thing to paste, reason. The buttons close it.
 */
const FailureNotice: React.FC<FailureNoticeProps> = ({
  message,
  tone,
  actions,
  panel = null,
  className,
}) => (
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
    <p className='mb-3 max-w-[720px] text-[13px] text-fg'>{message.action}</p>
    {message.copyable !== null && (
      <div className='mb-3 grid max-w-[720px] gap-1.5'>
        <span className='font-medium font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.12em]'>
          {message.copyable.label}
        </span>
        <div className='flex items-start gap-2.5 max-[720px]:flex-col max-[720px]:items-stretch'>
          <div className='min-w-0 flex-1'>
            <CopyValue value={message.copyable.value} label={message.copyable.label} wrap />
          </div>
          {panel !== null && (
            <span className='flex h-[38px] items-center max-[720px]:h-auto'>
              <PanelLink url={panel.url} label={panel.label} />
            </span>
          )}
        </div>
      </div>
    )}
    <p className='max-w-[720px] text-[13px] text-fg-3'>{message.description}</p>
    {(actions !== undefined && actions !== null) ||
    (panel !== null && message.copyable === null) ? (
      <div className='mt-3.5 flex flex-wrap items-center gap-2.5'>
        {panel !== null && message.copyable === null && (
          <PanelLink url={panel.url} label={panel.label} />
        )}
        {actions}
      </div>
    ) : null}
  </Notice>
);

export default FailureNotice;
