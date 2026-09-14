// src/components/RecordRow/RecordRow.tsx
import type React from 'react';
import CopyField from '@/components/CopyField/CopyField';
import { RECORD_TYPE } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';

type RecordRowProps = {
  host: string;
  fullName: string;
  value: string;
};

const LABEL = 'font-medium text-neutral-500 text-xs uppercase tracking-wider';

/**
 * The record laid out as one row, in the column order of the panel it is being copied into.
 *
 * Squarespace's Add Record form runs TYPE, NAME, PRIORITY, TTL, TEXT left to right, measured
 * 2026-09-13. Reading this row against that form should not need translating, so the order here is
 * theirs with priority dropped, which reads as a dash for TXT on every panel that shows it.
 *
 * Name and Value are the labels. No convention is universal: Squarespace says Name and Text,
 * Cloudflare says Name and Content, Namecheap and GoDaddy say Host and Value. Name and Value are
 * the pair that appears most often and neither is anyone's odd one out.
 *
 * Cells are fixed widths rather than shares of the row, so the row keeps the same shape whatever
 * the name and value happen to be, and the Value cell does not grow to 78 characters and squeeze
 * everything else. They add up to less than the card at `lg`, which is where the page stops growing
 * with the window, so above that breakpoint the row never wraps and nothing has to shrink. Below it
 * the row stacks and every cell takes the full width, which is the 375px case.
 */
const RecordRow: React.FC<RecordRowProps> = ({ host, fullName, value }) => {
  return (
    <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-4'>
      <div className='flex min-w-0 flex-col gap-1.5 lg:w-16'>
        <span className={LABEL}>{claimCopy.record.typeLabel}</span>
        <code className='w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-neutral-900 text-sm'>
          {RECORD_TYPE}
        </code>
      </div>

      <CopyField
        label={claimCopy.record.nameLabel}
        value={host}
        className='lg:w-56'
        hint={
          <>
            {claimCopy.record.nameHint}
            {/*
              The full name is the remediation for a panel that does not append the zone, so it sits
              under the form that usually works rather than beside it as a second co-equal field.
              Closed by default means the value a person copies without reading is the short one.
              It keeps its own copy control, because the panel that needs it is the panel where an
              underscore label has to be typed exactly.
            */}
            <details className='mt-2'>
              {/*
                Left as a list-item rather than given a display, because `inline-flex` on a summary
                drops the disclosure triangle in WebKit and the triangle is the part that says this
                opens.
              */}
              <summary className='cursor-pointer text-neutral-600 text-sm underline underline-offset-4 marker:text-neutral-400 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'>
                {claimCopy.record.fullNameSummary}
              </summary>
              <div className='mt-2'>
                {/*
                  Wrapped rather than scrolled. This field is under the row rather than in it, so
                  nothing has to line up with it, and the person reading it is the one about to type
                  an underscore label into a panel by hand.
                */}
                <CopyField
                  label={claimCopy.record.nameLabel}
                  labelHidden
                  wrap
                  value={fullName}
                  hint={claimCopy.record.fullNameHint}
                />
              </div>
            </details>
          </>
        }
      />

      <CopyField
        label={claimCopy.record.valueLabel}
        value={value}
        className='lg:w-72'
        hint={claimCopy.record.valueHint}
      />

      {/*
        TTL is a cell because it is a column in the panel, and it is not a value to copy. Squarespace
        offers it as a dropdown defaulting to 4 hrs, measured 2026-09-13, so a number here is advice
        that cannot be followed. It also changes nothing the check sees: the TXT query goes to
        authoritative nameservers, which serve their zone and do not cache.
      */}
      <div className='flex min-w-0 flex-col gap-1.5 lg:w-40'>
        <span className={LABEL}>{claimCopy.record.ttlLabel}</span>
        <p className='py-2 text-neutral-700 text-sm'>{claimCopy.record.ttlValue}</p>
        <p className='text-neutral-600 text-sm leading-relaxed'>{claimCopy.record.ttlHint}</p>
      </div>
    </div>
  );
};

export default RecordRow;
