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
 *
 * `prefetch={false}` for the same reason. The record screen starts its check in the page body, so a
 * prefetched row would run a DNS trace and a database write for a claim the person only moved their
 * cursor across. The prefetch comes back when the check moves to an endpoint with the timeline.
 */
const ClaimRow: React.FC<ClaimRowProps> = ({ claim }) => {
  const message = describeClaimRow(claim);

  return (
    <li>
      <Link
        href={claimPath(claim.id)}
        prefetch={false}
        className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900'
      >
        <span className='min-w-0 break-all font-medium font-mono text-neutral-900 text-sm'>
          {claim.name}
        </span>
        <StatusPill label={message.label} tone={message.tone} />
      </Link>
    </li>
  );
};

export default ClaimRow;
