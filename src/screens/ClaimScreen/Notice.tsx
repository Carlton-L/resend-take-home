// src/screens/ClaimScreen/Notice.tsx
import type React from 'react';

type NoticeProps = {
  /** wait: time will fix it. warn: the person's move. good: done. */
  tone: 'wait' | 'warn' | 'good' | 'live';
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

const Icon: React.FC<{ tone: NoticeProps['tone'] }> = ({ tone }) => {
  if (tone === 'warn') {
    return (
      <span
        aria-hidden='true'
        className='grid size-5 flex-none place-items-center rounded-full bg-warn font-bold text-[12px] text-on-warn leading-none'
      >
        !
      </span>
    );
  }
  if (tone === 'live') {
    return <span aria-hidden='true' className='live-dot size-2 flex-none rounded-full bg-signal' />;
  }
  if (tone === 'good') {
    return <span aria-hidden='true' className='size-5 flex-none rounded-full bg-signal' />;
  }
  return (
    <span
      aria-hidden='true'
      className='grid size-5 flex-none place-items-center rounded-full border-[1.5px] border-wait'
    >
      <span className='dot-breathe size-1.5 rounded-full bg-wait' />
    </span>
  );
};

/** A result: what happened, in a line, then what it found and what to do next. */
const Notice: React.FC<NoticeProps> = ({ tone, title, children, className = '' }) => (
  <div className={`rounded-md border border-line bg-bg px-[18px] py-4 ${className}`}>
    <div className='mb-1.5 flex items-center gap-2.5 font-semibold text-[14.5px]'>
      <Icon tone={tone} />
      <span>{title}</span>
    </div>
    {children}
  </div>
);

export default Notice;
