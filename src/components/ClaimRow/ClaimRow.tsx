// src/components/ClaimRow/ClaimRow.tsx
import Link from 'next/link';
import type React from 'react';
import StatusPill from '@/components/StatusPill/StatusPill';
import { claimPath } from '@/lib/claims/config';
import { describeClaimRow } from '@/lib/claims/messages';
import type { ClaimSummary } from '@/lib/claims/store';

type ClaimRowProps = {
  claim: ClaimSummary;
};

/**
 * One claim in the list: the name, its state, and a way into it.
 *
 * Both come from the row. Nothing here asks DNS anything, so a list of twenty names costs one
 * query.
 */
const ClaimRow: React.FC<ClaimRowProps> = ({ claim }) => {
  const message = describeClaimRow(claim);

  return (
    <li>
      <Link
        href={claimPath(claim.id)}
        className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900'
      >
        <span className='min-w-0 break-all font-medium font-mono text-neutral-900 text-sm'>
          {claim.name}
        </span>
        {/*
          The detail sits after the pill so it reads on from it, in both the layout and a screen
          reader: the name, then At risk, then since when. Only an at-risk row has one.
        */}
        <span className='flex shrink-0 items-center gap-2'>
          <StatusPill label={message.label} tone={message.tone} />
          {message.detail !== null && (
            <span className='text-neutral-500 text-xs'>{message.detail}</span>
          )}
        </span>
      </Link>
    </li>
  );
};

export default ClaimRow;
