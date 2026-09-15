// src/components/ClaimRow/ClaimRow.tsx
import Link from 'next/link';
import type React from 'react';
import ClaimRowMenu from '@/components/ClaimRowMenu/ClaimRowMenu';
import StatusPill from '@/components/StatusPill/StatusPill';
import { claimPath } from '@/lib/claims/config';
import { describeClaimRow } from '@/lib/claims/messages';
import { recordFullName } from '@/lib/claims/record';
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
    <li className='flex items-center gap-1 pr-2 transition-colors hover:bg-surface-2'>
      <Link
        href={claimPath(claim.id)}
        className='flex min-w-0 flex-1 items-center gap-x-4 px-4 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal'
      >
        {/*
          One line, always. The name takes the whole track up to the pill, so the fade at the end
          of the track only ever touches a name long enough to reach it. A long name scrolls
          sideways under it rather than wrapping, the same rule as the record row, and the title
          carries the whole thing for a pointer. The full name is on the record screen.
        */}
        <span
          title={claim.name}
          className='min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-medium font-mono text-fg text-sm mask-r-from-[calc(100%-2rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {claim.name}
        </span>
        {/*
          The detail sits after the pill so it reads on from it, in both the layout and a screen
          reader: the name, then At risk, then since when. Only an at-risk row has one. Below sm
          it is hidden so the row stays one line; the record screen says the same thing in full.
        */}
        <span className='flex shrink-0 items-center gap-2'>
          <StatusPill label={message.label} tone={message.tone} />
          {message.detail !== null && (
            <span className='hidden text-fg-3 text-xs sm:inline'>{message.detail}</span>
          )}
        </span>
      </Link>
      <ClaimRowMenu id={claim.id} name={claim.name} host={recordFullName(claim.name)} />
    </li>
  );
};

export default ClaimRow;
