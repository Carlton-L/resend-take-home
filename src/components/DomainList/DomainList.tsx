// src/components/DomainList/DomainList.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useId, useMemo } from 'react';
import ClaimRow from '@/components/ClaimRow/ClaimRow';
import Notice from '@/components/Notice/Notice';
import { claimCopy, describeClaimRow } from '@/lib/claims/messages';
import type { ClaimSummary } from '@/lib/claims/store';

type DomainListProps = {
  claims: ClaimSummary[];
};

const SORTS = ['attention', 'newest', 'name'] as const;
const ATTENTION = 'attention';
type Sort = (typeof SORTS)[number];

/** Attention first, then waiting, then held. The same order the tone vocabulary already implies. */
const TONE_RANK = { attention: 0, neutral: 1, good: 2 } as const;

const CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
const CHIP_ON = 'border-signal text-signal';
const CHIP_OFF = 'border-line-2 text-fg-2 hover:border-fg-3 hover:text-fg';

const isSort = (value: string | null): value is Sort => SORTS.includes(value as Sort);

/**
 * The rows the page loaded, filtered by the word on their pill and sorted, with the choice kept
 * in the URL so it survives Refresh and a reload. Nothing here queries anything: the account's
 * whole list is already in the page, and the claim limit keeps it small.
 *
 * The chips are built from the labels the rows actually carry, so a status the account does not
 * have gets no chip, and the counts double as a summary of the account before a row is read.
 */
const DomainList: React.FC<DomainListProps> = ({ claims }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sortId = useId();
  const copy = claimCopy.list;

  const rows = useMemo(
    () => claims.map((claim) => ({ claim, message: describeClaimRow(claim) })),
    [claims],
  );

  const labels = useMemo(() => {
    const seen = new Map<string, number>();
    for (const { message } of rows) {
      seen.set(message.label, (seen.get(message.label) ?? 0) + 1);
    }
    return [...seen.entries()];
  }, [rows]);

  // `attention` is a value of its own, covering every pill word whose tone is attention, since a
  // list can hold At risk and Expired at once and the notice above speaks for both.
  const status = params.get('status');
  const active = status === ATTENTION || labels.some(([label]) => label === status) ? status : null;
  const sortParam = params.get('sort');
  const sort: Sort = isSort(sortParam) ? sortParam : 'attention';

  const set = (key: 'status' | 'sort', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const query = next.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  // The sort is stable, so inside each tone the server's newest-first order holds and the claim
  // made a minute ago still leads the pending group.
  const shown = useMemo(() => {
    const kept =
      active === null
        ? rows
        : active === ATTENTION
          ? rows.filter(({ message }) => message.tone === 'attention')
          : rows.filter(({ message }) => message.label === active);
    if (sort === 'newest') {
      return kept;
    }
    return [...kept].sort((a, b) =>
      sort === 'name'
        ? a.claim.name.localeCompare(b.claim.name)
        : TONE_RANK[a.message.tone] - TONE_RANK[b.message.tone],
    );
  }, [rows, active, sort]);

  // Every row whose next move is the person's, and the pill word to filter on for them. Said in
  // words above the list, because any sort or filter can put those rows below the fold.
  const attention = rows.filter(({ message }) => message.tone === 'attention');

  return (
    <div className='flex flex-col gap-4'>
      {attention.length > 0 && active !== ATTENTION && (
        <Notice tone='attention'>
          <span className='flex flex-wrap items-center justify-between gap-3'>
            <span>{copy.attention.count(attention.length)}</span>
            <button
              type='button'
              onClick={() => set('status', ATTENTION)}
              className='rounded-md border border-attention-line px-2.5 py-1 font-medium text-attention-fg text-sm transition-colors hover:bg-attention-glyph/15 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
            >
              {copy.attention.show}
            </button>
          </span>
        </Notice>
      )}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {/* A fieldset, since the chips are one control with one value. The legend is its name. */}
        <fieldset className='flex flex-wrap gap-1.5'>
          <legend className='sr-only'>{copy.filter.label}</legend>
          <button
            type='button'
            aria-pressed={active === null}
            onClick={() => set('status', null)}
            className={`${CHIP_CLASS} ${active === null ? CHIP_ON : CHIP_OFF}`}
          >
            {copy.filter.all}
            <span className='font-mono text-xs opacity-70'>{claims.length}</span>
          </button>
          {labels.map(([label, count]) => (
            <button
              key={label}
              type='button'
              aria-pressed={active === label}
              onClick={() => set('status', label)}
              className={`${CHIP_CLASS} ${active === label ? CHIP_ON : CHIP_OFF}`}
            >
              {label}
              <span className='font-mono text-xs opacity-70'>{count}</span>
            </button>
          ))}
        </fieldset>
        <label htmlFor={sortId} className='flex items-center gap-2 text-fg-3 text-sm'>
          {copy.sort.label}
          <select
            id={sortId}
            value={sort}
            onChange={(event) =>
              set('sort', event.target.value === 'attention' ? null : event.target.value)
            }
            className='rounded-md border border-line-2 bg-surface px-2 py-1 text-fg text-sm focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
          >
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {copy.sort[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className='overflow-hidden rounded-lg border border-line bg-surface'>
        {shown.length === 0 ? (
          <p className='p-8 text-fg-2 text-sm'>{copy.filter.none(active ?? '')}</p>
        ) : (
          <ul className='divide-y divide-line'>
            {shown.map(({ claim }) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DomainList;
