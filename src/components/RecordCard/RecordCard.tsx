// src/components/RecordCard/RecordCard.tsx
import type React from 'react';
import RecordRow from '@/components/RecordRow/RecordRow';
import { claimCopy, formatWhen } from '@/lib/claims/messages';

type RecordCardProps = {
  name: string;
  host: string;
  fullName: string;
  value: string;
  expiresAt: Date;
  /**
   * Whether this claim already holds its name. Read from the claim row, so it is known in the page
   * shell before the check inside the Suspense boundary resolves.
   */
  held: boolean;
};

const SHELL = 'rounded-md border border-neutral-200 bg-white p-5';

/**
 * The record to add, and nothing about whether it has been found. This renders in the page body
 * while the check streams in behind it, so a slow or broken zone never holds back the value the
 * user opened the page to copy.
 *
 * On a claim that already holds its name the card collapses. "Add this record" is instruction for
 * work already done, and a verified claim's page is about the state of the name rather than about
 * filling in a form. The record is still one click away, because comparing the value here against
 * the value in the panel is the reason someone opens a verified claim.
 *
 * A claim that is pending on arrival and verifies during this render stays expanded for that
 * render, which is the right shape: that person has just added the record and is watching it land.
 */
const RecordCard: React.FC<RecordCardProps> = ({
  name,
  host,
  fullName,
  value,
  expiresAt,
  held,
}) => {
  const body = (
    <>
      <RecordRow host={host} fullName={fullName} value={value} />
      <p className='mt-5 border-neutral-200 border-t pt-4 text-neutral-600 text-sm leading-relaxed'>
        {claimCopy.record.expiry(formatWhen(expiresAt))}
      </p>
    </>
  );

  if (held) {
    return (
      <details className={SHELL}>
        <summary className='cursor-pointer font-medium marker:text-neutral-500'>
          {claimCopy.record.headingHeld}
        </summary>
        <div className='mt-5'>{body}</div>
      </details>
    );
  }

  return (
    <section className={SHELL}>
      <div className='mb-5 flex flex-col gap-1'>
        <h2 className='font-medium text-lg tracking-tight'>{claimCopy.record.heading}</h2>
        <p className='text-neutral-600 text-sm leading-relaxed'>{claimCopy.record.intro(name)}</p>
      </div>
      {body}
    </section>
  );
};

export default RecordCard;
