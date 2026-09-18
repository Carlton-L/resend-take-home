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
   * Whether this claim already holds its name. Read from the claim row, so it is known when the
   * page renders and before the browser has asked for a check.
   */
  held: boolean;
};

const SHELL = 'rounded-lg border border-line bg-surface p-5';

/**
 * The record to add, and nothing about whether it has been found. It renders from the row on the
 * server, and the check is a separate request the browser makes afterwards, so a slow or broken
 * zone never holds back the value the user opened the page to copy.
 *
 * On a claim that already holds its name the card collapses. "Add this record" is instruction for
 * work already done, and a verified claim's page is about the state of the name rather than about
 * filling in a form. The record is still one click away, because comparing the value here against
 * the value in the panel is the reason someone opens a verified claim.
 *
 * A claim that is pending on arrival and verifies on its first check stays expanded until the next
 * load, which is the right shape: that person has just added the record and is watching it land.
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
      {/*
        A held claim's token expiry is always in the past once the name has been held for longer
        than the token's seven days, because verifying does not clear it, and that date is sitting
        in the record value directly above. Said where it is read rather than left to be worked out.
      */}
      <p className='mt-5 border-line border-t pt-4 text-fg-2 text-sm leading-relaxed'>
        {held
          ? claimCopy.record.heldExpiry(formatWhen(expiresAt))
          : claimCopy.record.expiry(formatWhen(expiresAt))}
      </p>
    </>
  );

  if (held) {
    return (
      <details className={SHELL}>
        <summary className='cursor-pointer rounded-sm font-medium marker:text-fg-3 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'>
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
        <p className='text-fg-2 text-sm leading-relaxed'>{claimCopy.record.intro(name)}</p>
      </div>
      {body}
    </section>
  );
};

export default RecordCard;
