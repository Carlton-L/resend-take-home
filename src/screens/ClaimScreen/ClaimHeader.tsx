// src/screens/ClaimScreen/ClaimHeader.tsx
'use client';

import { forwardRef, useState } from 'react';
import Pill from '@/components/Pill/Pill';
import type { ClaimDetailDTO } from '@/lib/claims/dto';
import { formatDay, type Tone } from '@/lib/claims/row';
import { claimScreenCopy } from '@/lib/copy/claim';
import { useMenu } from '@/lib/hooks/useMenu';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import OutArrow from '@/screens/ClaimScreen/OutArrow';

type ClaimHeaderProps = {
  claim: ClaimDetailDTO;
  pill: { word: string; tone: Tone; busy: boolean } | null;
  now: Date | null;
  onRelease: () => void;
};

/** "Claimed Sep 21 · DNS at Namecheap · Record valid until Oct 1", or "Verified Sep 2 · DNS at Cloudflare". */
const metaLine = (claim: ClaimDetailDTO, now: Date | null): string => {
  const copy = claimScreenCopy.header;
  const parts: string[] = [];
  parts.push(
    claim.verifiedAt !== null
      ? copy.verified(formatDay(new Date(claim.verifiedAt)))
      : copy.claimed(formatDay(new Date(claim.issuedAt))),
  );
  if (claim.dnsHost !== null) {
    parts.push(copy.dnsAt(claim.dnsHost));
  }
  const expires = new Date(claim.expiresAt);
  if (claim.status === 'pending' && now !== null && expires.getTime() > now.getTime()) {
    parts.push(copy.validUntil(formatDay(expires)));
  }
  return parts.join(' · ');
};

/**
 * The claim's name, state and actions, held at the top while the cards scroll under it. On a
 * phone the pill moves under the name and Open DNS moves into the menu.
 */
const ClaimHeader = forwardRef<HTMLDivElement, ClaimHeaderProps>(
  ({ claim, pill, now, onRelease }, ref) => {
    const { open, triggerRef, menuRef, toggle, close } = useMenu();
    const [copied, setCopied] = useState(false);
    const copy = claimScreenCopy.header;
    const dns = claim.dnsPanelUrl !== null && claim.dnsHost !== null;

    const copyRecord = async () => {
      try {
        await navigator.clipboard.writeText(claim.record.value);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          close();
        }, 900);
      } catch {
        close();
      }
    };

    const item =
      'block w-full rounded-[5px] px-2.5 py-2 text-left text-[13px] hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none';

    return (
      <div
        ref={ref}
        className='sticky top-13 z-10 -mx-6 bg-bg px-6 pt-[92px] pb-[22px] after:pointer-events-none after:absolute after:top-full after:right-0 after:left-0 after:h-[18px] after:bg-[linear-gradient(#0a0a0b,rgba(10,10,11,0))] max-[720px]:pt-7 max-[720px]:pb-4'
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-y-2.5 [grid-template-areas:'name_menu'_'meta_meta'] max-[720px]:gap-y-2 max-[720px]:[grid-template-areas:'name_menu'_'pill_pill'_'meta_meta']">
          <div className='flex min-w-0 items-center gap-3.5 [grid-area:name] max-[720px]:contents'>
            <h1 className='truncate font-semibold text-[34px] leading-[1.2] tracking-[-0.02em] max-[720px]:text-[21px] max-[720px]:[grid-area:name]'>
              {claim.name}
            </h1>
            <span className='min-h-6 justify-self-start max-[720px]:[grid-area:pill]'>
              {pill !== null && (
                <Pill tone={pill.tone} busy={pill.busy}>
                  {pill.word}
                </Pill>
              )}
            </span>
          </div>

          <div className='relative [grid-area:menu]'>
            <button
              ref={triggerRef}
              type='button'
              onClick={toggle}
              aria-expanded={open}
              aria-label={copy.menu}
              className={`${BUTTON.small} w-[34px] px-0`}
            >
              <svg
                aria-hidden='true'
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='currentColor'
              >
                <circle cx='3.5' cy='8' r='1.3' />
                <circle cx='8' cy='8' r='1.3' />
                <circle cx='12.5' cy='8' r='1.3' />
              </svg>
            </button>
            {open && (
              <div
                ref={menuRef}
                className='enter-up-fast absolute top-[calc(100%+6px)] right-0 z-20 min-w-[200px] rounded-[7px] border border-line-control bg-surface p-[5px] shadow-[0_18px_48px_rgba(0,0,0,0.6)]'
              >
                {dns && (
                  <a
                    href={claim.dnsPanelUrl ?? undefined}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`${item} hidden max-[720px]:block`}
                  >
                    {copy.openDns(claim.dnsHost ?? '')} ↗
                  </a>
                )}
                <button type='button' onClick={copyRecord} className={item}>
                  {copied ? copy.copied : copy.copyRecord}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    close();
                    onRelease();
                  }}
                  className={`${item} text-warn`}
                >
                  {copy.release}
                </button>
              </div>
            )}
          </div>

          <div className='flex min-w-0 items-center justify-between gap-3 [grid-area:meta]'>
            <p className='min-w-0 text-[12.5px] text-fg-5 max-[720px]:whitespace-normal'>
              {metaLine(claim, now)}
            </p>
            {dns && (
              <a
                href={claim.dnsPanelUrl ?? undefined}
                target='_blank'
                rel='noopener noreferrer'
                className={`${BUTTON.small} max-[720px]:hidden`}
              >
                {copy.openDns(claim.dnsHost ?? '')}
                <OutArrow />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ClaimHeader.displayName = 'ClaimHeader';

export default ClaimHeader;
