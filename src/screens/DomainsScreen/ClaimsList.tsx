// src/screens/DomainsScreen/ClaimsList.tsx
'use client';

import Link from 'next/link';
import type React from 'react';
import { useClaims } from '@/client/queries';
import { useShell } from '@/client/shellStore';
import { useNow } from '@/client/useNow';
import Favicon from '@/components/Favicon/Favicon';
import Operator from '@/components/Operator/Operator';
import Pill from '@/components/Pill/Pill';
import { claimPath } from '@/lib/claims/config';
import type { ClaimDTO } from '@/lib/claims/dto';
import { claimRowView } from '@/lib/claims/row';
import { domainsCopy } from '@/lib/copy/domains';

/**
 * Favicon, name and host, pill, the one date that matters, chevron. Below 900px the date goes.
 * Below 720px the pill moves under the name and the host goes.
 */
const ROW =
  'group/row grid h-16 w-full grid-cols-[36px_minmax(0,1fr)_190px_190px_16px] items-center gap-4 px-[18px] text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 max-[900px]:grid-cols-[36px_minmax(0,1fr)_auto_16px] max-[720px]:h-auto max-[720px]:grid-cols-[36px_minmax(0,1fr)_16px] max-[720px]:gap-x-4 max-[720px]:gap-y-1.5 max-[720px]:px-4 max-[720px]:py-3';

const Row: React.FC<{ claim: ClaimDTO; now: Date | null; isNew: boolean }> = ({
  claim,
  now,
  isNew,
}) => {
  const view = now === null ? null : claimRowView(claim, now);
  return (
    <li
      className={`max-h-16 overflow-hidden border-line border-t first:border-t-0 max-[720px]:max-h-none ${isNew ? 'row-in' : ''}`}
    >
      <Link href={claimPath(claim.id)} className={ROW}>
        <span className='max-[720px]:row-span-2 max-[720px]:self-center'>
          <Favicon badge={view?.badge ?? null} ring='row' />
        </span>
        <span className='min-w-0'>
          <b className='block truncate font-medium text-base text-fg'>{claim.name}</b>
          {/* Holds its line before the first check, so rows don't change height later. */}
          <span className='block min-h-[17px] font-mono text-[11.5px] text-fg-5 max-[720px]:hidden'>
            {claim.dnsHost === null ? '' : domainsCopy.list.dnsAt(claim.dnsHost)}
          </span>
        </span>
        <span className='max-[720px]:col-start-2 max-[720px]:row-start-2'>
          {view !== null && <Pill tone={view.tone}>{view.word}</Pill>}
        </span>
        <span className='whitespace-nowrap text-[12.5px] text-fg-3 max-[900px]:hidden'>
          {view?.detail}
        </span>
        <svg
          aria-hidden='true'
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
          className='text-fg-5 group-hover/row:text-fg max-[720px]:col-start-3 max-[720px]:row-span-2 max-[720px]:row-start-1 max-[720px]:self-center'
        >
          <path
            d='M6 3.5l4.5 4.5L6 12.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </Link>
    </li>
  );
};

/** While the list loads: rows of the same height, so nothing moves when it arrives. */
const Skeleton: React.FC = () => (
  <>
    {[0, 1, 2].map((key) => (
      <li key={key} aria-hidden='true' className='border-line border-t first:border-t-0'>
        <div className='flex h-16 items-center gap-4 px-[18px]'>
          <span className='size-9 flex-none rounded-[7px] bg-surface-2' />
          <span className='h-3.5 w-40 rounded bg-surface-2' />
        </div>
      </li>
    ))}
  </>
);

const ClaimsList: React.FC = () => {
  const { data: claims } = useClaims();
  const { added } = useShell();
  const now = useNow();

  return (
    <Operator
      label={domainsCopy.list.card}
      badge={claims?.length ?? <span className='invisible'>0</span>}
    >
      <ul aria-busy={claims === undefined}>
        {claims === undefined && <Skeleton />}
        {claims?.length === 0 && (
          <li className='p-[18px] text-[13px] text-fg-3'>{domainsCopy.list.empty}</li>
        )}
        {claims?.map((claim) => (
          <Row key={claim.id} claim={claim} now={now} isNew={claim.id === added} />
        ))}
      </ul>
    </Operator>
  );
};

export default ClaimsList;
