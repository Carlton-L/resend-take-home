// src/screens/ClaimScreen/ClaimHeader.tsx
'use client';

import { forwardRef } from 'react';
import Pill from '@/components/Pill/Pill';
import type { ClaimDetailDTO } from '@/lib/claims/dto';
import { formatDay, type Tone } from '@/lib/claims/row';
import { claimScreenCopy } from '@/lib/copy/claim';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import DotCover from '@/screens/ClaimScreen/DotCover';
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
 * phone the pill moves under the name.
 */
const ClaimHeader = forwardRef<HTMLDivElement, ClaimHeaderProps>(
  ({ claim, pill, now, onRelease }, ref) => {
    const copy = claimScreenCopy.header;
    const dns = claim.dnsPanelUrl !== null && claim.dnsHost !== null;

    return (
      <div
        ref={ref}
        className='sticky top-13 z-10 -mx-6 px-6 pt-[92px] pb-[22px] max-[720px]:pt-7 max-[720px]:pb-4'
      >
        {/* The page ground with its dots, so cards scrolling under the header are hidden and the
            grid still runs through it. The strip under it fades the cards out as they go. */}
        <DotCover className='inset-0' />
        <DotCover className='top-full right-0 left-0 h-[18px] [mask-image:linear-gradient(#000,transparent)]' />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-y-2.5 [grid-template-areas:'name_action'_'meta_meta'] max-[720px]:gap-y-2 max-[720px]:[grid-template-areas:'name_action'_'pill_pill'_'meta_meta']">
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

          <button
            type='button'
            onClick={onRelease}
            className={`${BUTTON.small} [grid-area:action]`}
          >
            {copy.release}
          </button>

          {/* As tall as the Open DNS button from the start, so the header doesn't grow when the
              first check names the host and the button appears. */}
          <div className='flex min-h-7 min-w-0 items-center justify-between gap-3 [grid-area:meta]'>
            <p className='min-w-0 text-[12.5px] text-fg-5 max-[720px]:whitespace-normal'>
              {metaLine(claim, now)}
            </p>
            {dns && (
              <a
                href={claim.dnsPanelUrl ?? undefined}
                target='_blank'
                rel='noopener noreferrer'
                className={`${BUTTON.small} flex-none`}
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
