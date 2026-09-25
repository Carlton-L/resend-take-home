// src/screens/DomainsScreen/ClaimsList.tsx
'use client';

import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { CLAIMS_KEY, claimKey, releaseClaim } from '@/client/api';
import { shell, useShell } from '@/client/shellStore';
import Favicon from '@/components/Favicon/Favicon';
import Operator from '@/components/Operator/Operator';
import Pill from '@/components/Pill/Pill';
import { claimPath } from '@/lib/claims/config';
import type { ClaimDTO } from '@/lib/claims/dto';
import { chipsFor, SORTS, shownRows } from '@/lib/claims/listView';
import { claimCopy } from '@/lib/claims/messages';
import { recordFullName } from '@/lib/claims/record';
import type { ClaimRowView } from '@/lib/claims/row';
import { domainsCopy } from '@/lib/copy/domains';
import ReleaseDialog from '@/screens/ClaimScreen/ReleaseDialog';
import { useListRows } from '@/screens/DomainsScreen/useListRows';

/**
 * Favicon, name and host, pill, the one date that matters, chevron. Below 900px the date goes.
 * Below 720px the pill moves under the name and the host goes.
 */
const ROW =
  'grid h-16 min-w-0 flex-1 grid-cols-[36px_minmax(0,1fr)_190px_190px_16px] items-center gap-4 pl-[18px] text-left focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-wait focus-visible:-outline-offset-2 max-[900px]:grid-cols-[36px_minmax(0,1fr)_auto_16px] max-[720px]:h-auto max-[720px]:grid-cols-[36px_minmax(0,1fr)_16px] max-[720px]:gap-x-4 max-[720px]:gap-y-1.5 max-[720px]:py-3 max-[720px]:pl-4';

const MENU_ITEM =
  'flex h-8 w-full items-center whitespace-nowrap rounded-[5px] px-2.5 text-left text-[13px] text-warn hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none';

/**
 * The row's menu, beside its link so the two stay separate controls. One item for now: release.
 * It opens to the left, inside the row's height, so the row's clip never cuts it off. Closes on
 * Escape, on a click outside and when focus leaves it.
 */
const RowMenu: React.FC<{ name: string; onRelease: () => void }> = ({ name, onRelease }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    itemRef.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const leave = (event: React.FocusEvent) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  const closeOnEscape = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className='relative flex flex-none items-center px-2 max-[720px]:px-1.5'>
      <button
        ref={triggerRef}
        type='button'
        aria-label={domainsCopy.list.menu(name)}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={leave}
        onKeyDown={closeOnEscape}
        className={`flex size-8 items-center justify-center rounded-[7px] text-fg-5 transition-colors hover:bg-surface-3 hover:text-fg focus-visible:text-fg focus-visible:outline-2 focus-visible:outline-wait ${open ? 'bg-surface-3 text-fg' : ''}`}
      >
        <svg aria-hidden='true' width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
          <circle cx='3.5' cy='8' r='1.25' />
          <circle cx='8' cy='8' r='1.25' />
          <circle cx='12.5' cy='8' r='1.25' />
        </svg>
      </button>
      {open && (
        <div
          role='menu'
          aria-label={domainsCopy.list.menu(name)}
          className='absolute top-1/2 right-full z-30 -translate-y-1/2 rounded-lg border border-line-control bg-surface-2 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]'
        >
          <button
            ref={itemRef}
            type='button'
            role='menuitem'
            onBlur={leave}
            onKeyDown={closeOnEscape}
            onClick={() => {
              setOpen(false);
              onRelease();
            }}
            className={MENU_ITEM}
          >
            {claimCopy.release.trigger}
          </button>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{
  claim: ClaimDTO;
  view: ClaimRowView;
  isNew: boolean;
  onRelease: () => void;
}> = ({ claim, view, isNew, onRelease }) => {
  return (
    <li
      className={`group/row flex max-h-16 overflow-hidden border-line border-t transition-colors first:border-t-0 hover:bg-surface-2 max-[720px]:max-h-none ${isNew ? 'row-in' : ''}`}
    >
      <Link href={claimPath(claim.id)} className={ROW}>
        <span className='max-[720px]:row-span-2 max-[720px]:self-center'>
          <Favicon badge={view.badge} ring='row' claimId={claim.id} />
        </span>
        <span className='min-w-0'>
          <b className='block truncate font-medium text-base text-fg'>{claim.name}</b>
          {/* Holds its line before the first check, so rows don't change height later. */}
          <span className='block min-h-[17px] font-mono text-[11.5px] text-fg-5 max-[720px]:hidden'>
            {claim.dnsHost === null ? '' : domainsCopy.list.dnsAt(claim.dnsHost)}
          </span>
        </span>
        <span className='max-[720px]:col-start-2 max-[720px]:row-start-2'>
          <Pill tone={view.tone}>{view.word}</Pill>
        </span>
        <span className='whitespace-nowrap text-[12.5px] text-fg-3 max-[900px]:hidden'>
          {view.detail}
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
      <RowMenu name={claim.name} onRelease={onRelease} />
    </li>
  );
};

/**
 * While the list loads: rows of the same height, so nothing moves when it arrives. On a phone a row
 * is two lines, the name and the pill under it.
 */
const Skeleton: React.FC = () => (
  <>
    {[0, 1, 2].map((key) => (
      <li key={key} aria-hidden='true' className='border-line border-t first:border-t-0'>
        <div className='flex h-16 items-center gap-4 px-[18px] max-[720px]:h-20 max-[720px]:pl-4'>
          <span className='size-9 flex-none rounded-[7px] bg-surface-2' />
          <span className='flex flex-col gap-2.5'>
            <span className='h-3.5 w-40 rounded bg-surface-2' />
            <span className='hidden h-5 w-20 rounded-full bg-surface-2 max-[720px]:block' />
          </span>
        </div>
      </li>
    ))}
  </>
);

/** The chips' line on a phone, held while the list loads. */
const ChipsSkeleton: React.FC = () => (
  <span aria-hidden='true' className='order-3 hidden h-6 w-full gap-1.5 max-[720px]:flex'>
    <span className='h-6 w-14 rounded-full bg-surface-2' />
    <span className='h-6 w-20 rounded-full bg-surface-2' />
  </span>
);

const CHIP =
  'inline-flex h-6 flex-none whitespace-nowrap items-center gap-1.5 rounded-full border px-[9px] text-xs leading-none transition-colors focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2';
const CHIP_ON = 'border-signal/45 bg-signal-soft text-signal';
const CHIP_OFF = 'border-line-control text-fg-3 hover:border-line-2 hover:text-fg';

const SMALL_BUTTON =
  'inline-flex h-7 items-center gap-2 rounded-[7px] border border-line-control bg-surface-2 px-2.5 font-medium text-fg text-xs transition-colors hover:border-[#36363b] hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2';

/** Long enough to be seen, so Refresh never looks like it did nothing. */
const REFRESH_MIN_MS = 500;

const RefreshIcon: React.FC<{ spinning: boolean }> = ({ spinning }) => (
  <svg
    aria-hidden='true'
    viewBox='0 0 16 16'
    width='15'
    height='15'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={spinning ? 'animate-spin motion-reduce:animate-none' : ''}
  >
    <path d='M13.5 8a5.5 5.5 0 1 1-1.6-3.9' />
    <path d='M13.5 2.5v3h-3' />
  </svg>
);

/**
 * The account's claims. Chips filter by the word on the pill, the sort puts the rows that need
 * attention first by default, and Refresh reads the list again. None of them runs a check.
 */
const ClaimsList: React.FC = () => {
  const { claims, rows, filter, sort, set, refresh } = useListRows();
  const { added } = useShell();
  const [refreshing, setRefreshing] = useState(false);
  const [releasing, setReleasing] = useState<ClaimDTO | null>(null);
  const { mutate } = useSWRConfig();

  const release = async () => {
    if (releasing === null) {
      return;
    }
    const { id, name } = releasing;
    try {
      await releaseClaim(id);
      shell.released(name);
      await mutate<ClaimDTO[]>(CLAIMS_KEY, (list) => list?.filter((row) => row.id !== id), {
        revalidate: false,
      });
      await mutate(claimKey(id), undefined, { revalidate: false });
    } finally {
      setReleasing(null);
    }
  };
  const copy = claimCopy.list;

  const onRefresh = async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    await Promise.all([refresh(), new Promise((resolve) => setTimeout(resolve, REFRESH_MIN_MS))]);
    setRefreshing(false);
  };

  const controls = (
    <>
      {rows === null && <ChipsSkeleton />}
      {/* On a phone the chips are one line that scrolls sideways, so the header is one height. */}
      {rows !== null && (
        <fieldset className='ml-1.5 flex flex-wrap gap-1.5 max-[720px]:order-3 max-[720px]:ml-0 max-[720px]:w-full max-[720px]:flex-nowrap max-[720px]:overflow-x-auto max-[720px]:[scrollbar-width:none] max-[720px]:[&::-webkit-scrollbar]:hidden'>
          <legend className='sr-only'>{copy.filter.label}</legend>
          <button
            type='button'
            aria-pressed={filter === null}
            onClick={() => set('status', null)}
            className={`${CHIP} ${filter === null ? CHIP_ON : CHIP_OFF}`}
          >
            {copy.filter.all}
            <span className='font-medium font-mono text-[10.5px] opacity-70'>{rows.length}</span>
          </button>
          {chipsFor(rows).map(([word, count]) => (
            <button
              key={word}
              type='button'
              aria-pressed={filter === word}
              onClick={() => set('status', word)}
              className={`${CHIP} ${filter === word ? CHIP_ON : CHIP_OFF}`}
            >
              {word}
              <span className='font-medium font-mono text-[10.5px] opacity-70'>{count}</span>
            </button>
          ))}
        </fieldset>
      )}
      <div className='ml-auto flex items-center gap-2'>
        <span className='relative flex'>
          <select
            aria-label={copy.sort.label}
            value={sort}
            onChange={(event) =>
              set('sort', event.target.value === 'attention' ? null : event.target.value)
            }
            className='h-7 cursor-pointer appearance-none rounded-[7px] border border-line-control bg-surface-2 pr-[26px] pl-2.5 text-fg text-xs hover:border-[#36363b] focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
          >
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {copy.sort[option]}
              </option>
            ))}
          </select>
          <svg
            aria-hidden='true'
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
            className='pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-fg-3'
          >
            <path
              d='M3 4.5l3 3 3-3'
              stroke='currentColor'
              strokeWidth='1.4'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </span>
        <span className='group/tip relative'>
          <button
            type='button'
            onClick={onRefresh}
            aria-busy={refreshing}
            aria-describedby='refresh-note'
            className={SMALL_BUTTON}
          >
            <RefreshIcon spinning={refreshing} />
            {refreshing ? copy.refreshing : copy.refresh}
          </button>
          <span
            role='tooltip'
            id='refresh-note'
            className='pointer-events-none invisible absolute top-[calc(100%+8px)] right-0 z-50 w-[250px] max-w-[calc(100vw-24px)] -translate-y-[3px] rounded-md border border-[#303036] bg-[#1b1b1f] px-3 py-2.5 text-left text-[12.5px] text-fg leading-normal opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-[opacity,transform,visibility] duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100'
          >
            {copy.refreshNote}
          </span>
        </span>
      </div>
    </>
  );

  const shown = rows === null ? null : shownRows(rows, filter, sort);

  return (
    <Operator
      label={domainsCopy.list.card}
      badge={claims?.length ?? <span className='invisible'>0</span>}
      controls={controls}
    >
      <ul aria-busy={shown === null}>
        {shown === null && <Skeleton />}
        {rows?.length === 0 && (
          <li className='p-[18px] text-[13px] text-fg-3'>{domainsCopy.list.empty}</li>
        )}
        {rows !== null && rows.length > 0 && shown?.length === 0 && (
          <li className='p-[18px] text-[13px] text-fg-3'>{copy.filter.none(filter ?? '')}</li>
        )}
        {shown?.map(({ claim, view }) => (
          <Row
            key={claim.id}
            claim={claim}
            view={view}
            isNew={claim.id === added}
            onRelease={() => setReleasing(claim)}
          />
        ))}
      </ul>
      {releasing !== null && (
        <ReleaseDialog
          open
          name={releasing.name}
          fullName={recordFullName(releasing.name)}
          onCancel={() => setReleasing(null)}
          onConfirm={release}
        />
      )}
    </Operator>
  );
};

/** What shows before the list can render, including while the URL is read at build time. */
export const ClaimsListSkeleton: React.FC = () => (
  <Operator
    label={domainsCopy.list.card}
    badge={<span className='invisible'>0</span>}
    controls={
      <>
        <ChipsSkeleton />
        <span aria-hidden='true' className='ml-auto flex items-center gap-2'>
          <span className='h-7 w-[150px] rounded-[7px] bg-surface-2' />
          <span className='h-7 w-[84px] rounded-[7px] bg-surface-2' />
        </span>
      </>
    }
  >
    <ul aria-busy='true'>
      <Skeleton />
    </ul>
  </Operator>
);

export default ClaimsList;
