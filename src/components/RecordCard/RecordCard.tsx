// src/components/RecordCard/RecordCard.tsx
import type React from 'react';
import CopyField from '@/components/CopyField/CopyField';
import { RECORD_TYPE, SUGGESTED_TTL_SECONDS } from '@/lib/claims/config';
import { claimCopy, formatWhen } from '@/lib/claims/messages';

type RecordCardProps = {
  name: string;
  host: string;
  fullName: string;
  value: string;
  expiresAt: Date;
};

/**
 * The record to add, and nothing about whether it has been found. This renders in the page body
 * while the check streams in behind it, so a slow or broken zone never holds back the value the
 * user opened the page to copy.
 *
 * The short host is the one offered first. Squarespace appends the domain to that field
 * unconditionally and rejects the trailing dot that would escape it, measured 2026-09-12, so the
 * full name is the form that breaks there. Every panel accepts the short one.
 */
const RecordCard: React.FC<RecordCardProps> = ({ name, host, fullName, value, expiresAt }) => {
  return (
    <section className='flex flex-col gap-5 rounded-md border border-neutral-200 bg-white p-5'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-medium text-lg tracking-tight'>{claimCopy.record.heading}</h2>
        <p className='text-neutral-600 text-sm leading-relaxed'>{claimCopy.record.intro(name)}</p>
      </div>

      <CopyField label={claimCopy.record.hostLabel} value={host} hint={claimCopy.record.hostHint} />

      <CopyField
        label={claimCopy.record.fullNameLabel}
        value={fullName}
        hint={claimCopy.record.fullNameHint}
      />

      <div className='flex flex-col gap-1.5'>
        <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
          {claimCopy.record.typeLabel}
        </span>
        <code className='self-start rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-neutral-900 text-sm'>
          {RECORD_TYPE}
        </code>
      </div>

      <CopyField
        label={claimCopy.record.valueLabel}
        value={value}
        hint={claimCopy.record.valueHint}
      />

      <CopyField
        label={claimCopy.record.ttlLabel}
        value={String(SUGGESTED_TTL_SECONDS)}
        hint={claimCopy.record.ttlHint}
      />

      <p className='border-neutral-200 border-t pt-4 text-neutral-600 text-sm leading-relaxed'>
        {claimCopy.record.expiry(formatWhen(expiresAt))}
      </p>
    </section>
  );
};

export default RecordCard;
