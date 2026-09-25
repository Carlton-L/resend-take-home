// src/screens/ClaimScreen/Cards.tsx
'use client';

import Link from 'next/link';
import type React from 'react';
import { forwardRef, useId, useState } from 'react';
import type { ShownStep } from '@/client/check/checkReducer';
import CopyValue from '@/components/CopyValue/CopyValue';
import Operator from '@/components/Operator/Operator';
import Tip from '@/components/Tip/Tip';
import { DOMAINS_PATH } from '@/lib/claims/config';
import type { ClaimDetailDTO } from '@/lib/claims/dto';
import { claimCopy } from '@/lib/claims/messages';
import { formatDay } from '@/lib/claims/row';
import { claimScreenCopy } from '@/lib/copy/claim';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import OutArrow from '@/screens/ClaimScreen/OutArrow';
import StepRow from '@/screens/ClaimScreen/StepRow';

type Badge = { text: string; tone: 'neutral' | 'good' | 'wait' | 'warn' };

/** A card's place in the sequence: before the current one it dims, and eases back on hover. */
export type Place = 'past' | 'current';

const cardClass = (place: Place) =>
  `rounded-[9px] transition-[opacity,filter] duration-350 ease-out-soft focus:outline-none focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-4 ${place === 'past' ? 'card-past' : 'border-[#2e2e33]'}`;

/** A card takes focus after Check now, so the keyboard follows the check to where it lands. */
const focusable = (label: string) => ({ tabIndex: -1, role: 'group', 'aria-label': label });

/** The badge on a card that holds steps: what those steps are doing now. */
export const rowBadge = (steps: ShownStep[], idle: Badge): Badge => {
  const copy = claimScreenCopy.badge;
  if (steps.some((step) => step.state === 'run')) {
    return { text: copy.running, tone: 'good' };
  }
  if (steps.some((step) => step.state === 'wrong')) {
    return { text: copy.needsYou, tone: 'warn' };
  }
  if (steps.some((step) => step.state === 'wait')) {
    return { text: copy.waiting, tone: 'wait' };
  }
  if (steps.every((step) => step.state === 'done')) {
    return { text: copy.done, tone: 'good' };
  }
  return idle;
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className='flex items-center gap-1 font-medium font-mono text-[10px] text-fg-3 uppercase leading-none tracking-[0.12em]'>
    {children}
  </span>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className='text-[12.5px] text-fg-3 leading-normal'>{children}</p>
);

type NameserversCardProps = {
  place: Place;
  steps: ShownStep[];
  probe: number | null;
  dnsHost: string | null;
  /** The failure block, when step 01 or 02 stopped. */
  result: React.ReactNode;
};

export const NameserversCard = forwardRef<HTMLDivElement, NameserversCardProps>(
  ({ place, steps, probe, dnsHost, result }, ref) => {
    const badge = rowBadge(steps, { text: claimScreenCopy.badge.queued, tone: 'neutral' });
    const passed = steps.every((step) => step.state === 'done');
    return (
      <div ref={ref} className={cardClass(place)} {...focusable(claimScreenCopy.cards.nameservers)}>
        <Operator
          label={claimScreenCopy.cards.nameservers}
          badge={badge.text}
          badgeTone={badge.tone}
          controls={
            <span className='ml-auto font-mono text-[12px] text-fg-5 max-[720px]:hidden'>
              {passed && dnsHost !== null ? dnsHost : ''}
            </span>
          }
        >
          <div className='pb-[18px]'>
            <StepRow steps={steps} from={0} probe={probe} />
            {result !== null && <div className='mx-[18px] mt-3'>{result}</div>}
          </div>
        </Operator>
      </div>
    );
  },
);
NameserversCard.displayName = 'NameserversCard';

type RecordCardProps = {
  place: Place;
  claim: ClaimDetailDTO;
  /** Notices above the record: another account holds the name, the token was reissued. */
  notes: React.ReactNode;
  /** Check now and the timer, while the claim is waiting on its record. */
  gate: React.ReactNode;
};

export const RecordCard = forwardRef<HTMLDivElement, RecordCardProps>(
  ({ place, claim, notes, gate }, ref) => {
    const [full, setFull] = useState(false);
    const fullId = useId();
    const copy = claimCopy.record;
    const screen = claimScreenCopy;
    const { record, dnsHost, dnsPanelUrl } = claim;

    return (
      <div ref={ref} className={cardClass(place)} {...focusable(screen.cards.record)}>
        <Operator
          label={screen.cards.record}
          badge={screen.badge.txt}
          badgeTone='wait'
          controls={
            <span className='ml-auto font-mono text-[12px] text-fg-5 max-[720px]:hidden'>
              {dnsHost === null ? '' : screen.record.addIn(dnsHost)}
            </span>
          }
        >
          <div className='px-[18px] pt-[18px] pb-5 max-[720px]:px-3.5'>
            {notes}
            <div className='mb-3.5 flex items-center justify-between gap-4 max-[720px]:flex-col max-[720px]:items-start'>
              <p className='text-sm'>
                {dnsHost === null ? (
                  screen.record.addAtProvider
                ) : (
                  <>
                    {screen.record.your}{' '}
                    <Tip term={screen.tipTerms.nameservers} text={screen.tips.nameservers}>
                      {screen.record.nameservers}
                    </Tip>{' '}
                    {screen.record.areAt} <strong className='font-semibold'>{dnsHost}</strong>.{' '}
                    {screen.record.addThere}
                  </>
                )}
              </p>
              {dnsPanelUrl !== null && dnsHost !== null && (
                <a
                  href={dnsPanelUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={BUTTON.regular}
                >
                  {screen.header.openDns(dnsHost)}
                  <OutArrow />
                </a>
              )}
            </div>

            <div className='grid grid-cols-[64px_minmax(0,1.15fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] items-start gap-4 max-[900px]:grid-cols-1'>
              <div className='flex min-w-0 flex-col gap-2'>
                <Label>
                  <Tip term={screen.tipTerms.TXT} text={screen.tips.TXT}>
                    {copy.typeLabel}
                  </Tip>
                </Label>
                <div className='grid h-[38px] place-items-center rounded-md border border-line-control bg-surface-2 font-medium font-mono text-[13px] max-[900px]:w-16'>
                  {record.type}
                </div>
              </div>

              <div className='flex min-w-0 flex-col gap-2'>
                <Label>
                  <Tip term={screen.tipTerms.Name} text={screen.tips.Name}>
                    {copy.nameLabel}
                  </Tip>
                </Label>
                <CopyValue value={record.host} label={copy.nameLabel} />
                <Hint>{copy.nameHint}</Hint>
                <button
                  type='button'
                  aria-expanded={full}
                  aria-controls={fullId}
                  onClick={() => setFull((open) => !open)}
                  className='inline-flex items-center gap-1.5 text-left text-fg-3 text-xs underline decoration-fg-5 underline-offset-[3px] hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
                >
                  <svg
                    aria-hidden='true'
                    width='10'
                    height='10'
                    viewBox='0 0 10 10'
                    fill='none'
                    className={`flex-none transition-transform duration-200 ${full ? 'rotate-90' : ''}`}
                  >
                    <path
                      d='M3.5 2l3 3-3 3'
                      stroke='currentColor'
                      strokeWidth='1.4'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  {copy.fullNameSummary}
                </button>
                <div id={fullId} hidden={!full}>
                  <CopyValue value={record.fullName} label={copy.fullNameSummary} />
                </div>
              </div>

              <div className='flex min-w-0 flex-col gap-2'>
                <Label>
                  <Tip term={screen.tipTerms.Value} text={screen.tips.Value}>
                    {copy.valueLabel}
                  </Tip>
                </Label>
                <CopyValue value={record.value} label={copy.valueLabel} />
                <Hint>{copy.valueHint}</Hint>
              </div>

              <div className='flex min-w-0 flex-col gap-2'>
                <Label>
                  <Tip term={screen.tipTerms.TTL} text={screen.tips.TTL} align='right'>
                    {copy.ttlLabel}
                  </Tip>
                </Label>
                <div className='flex h-[38px] items-center font-medium text-[13.5px]'>
                  {copy.ttlValue}
                </div>
                <Hint>{copy.ttlHint}</Hint>
              </div>
            </div>

            {gate}
          </div>
        </Operator>
      </div>
    );
  },
);
RecordCard.displayName = 'RecordCard';

type CheckCardProps = {
  place: Place;
  steps: ShownStep[];
  probe: number | null;
  live: boolean;
  result: React.ReactNode;
};

export const CheckCard = forwardRef<HTMLDivElement, CheckCardProps>(
  ({ place, steps, probe, live, result }, ref) => {
    const copy = claimScreenCopy.badge;
    const found = rowBadge(steps, { text: copy.live, tone: 'wait' });
    const badge = live
      ? { text: copy.running, tone: 'good' as const }
      : found.text === copy.done
        ? { text: copy.live, tone: 'good' as const }
        : { text: copy.live, tone: found.tone };
    return (
      <div ref={ref} className={cardClass(place)} {...focusable(claimScreenCopy.cards.check)}>
        <Operator
          label={claimScreenCopy.cards.check}
          // Only on the current card. A past check card on a verified claim has nothing live to say.
          badge={place === 'past' && !live ? undefined : badge.text}
          badgeTone={badge.tone}
        >
          <div className='pb-[18px]'>
            <StepRow steps={steps} from={2} probe={probe} />
            <div aria-live='polite'>
              {result !== null && <div className='mx-[18px] mt-3 max-[720px]:mx-3.5'>{result}</div>}
            </div>
          </div>
        </Operator>
      </div>
    );
  },
);
CheckCard.displayName = 'CheckCard';

type VerifiedCardProps = {
  place: Place;
  claim: ClaimDetailDTO;
  /** Plays the verified moment. Only when it happens while the screen is open. */
  celebrate: boolean;
  /** How long the record was missing, when a check this visit took the claim out of at risk. */
  recoveredAfter?: string | null;
};

const CheckMark: React.FC = () => (
  <svg aria-hidden='true' width='30' height='30' viewBox='0 0 30 30'>
    <path
      d='M8 15.5l5 5 9.5-10.5'
      fill='none'
      stroke='#05140b'
      strokeWidth='3'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const VerifiedCard = forwardRef<HTMLDivElement, VerifiedCardProps>(
  ({ place, claim, celebrate, recoveredAfter = null }, ref) => {
    const copy = claimScreenCopy.verified;
    const risk = claim.status === 'at_risk';
    const since = claim.failingSince === null ? '' : formatDay(new Date(claim.failingSince));
    return (
      <div
        ref={ref}
        className={`${cardClass(place)} ${celebrate ? 'celebrate' : ''}`}
        {...focusable(claimScreenCopy.cards.verified)}
      >
        <Operator
          label={claimScreenCopy.cards.verified}
          badge={risk ? claimScreenCopy.badge.atRisk : claimScreenCopy.badge.output}
          badgeTone={risk ? 'warn' : 'good'}
          className={celebrate ? 'card-glow transition-[border-color,box-shadow] duration-500' : ''}
        >
          <div className='flex min-h-[190px] items-center gap-6 px-[26px] py-7 max-[720px]:flex-col max-[720px]:items-start'>
            {risk ? (
              <span className='grid size-[72px] flex-none place-items-center rounded-full border-[1.5px] border-warn bg-warn-soft'>
                <span
                  aria-hidden='true'
                  className='grid size-[30px] place-items-center rounded-full bg-warn font-bold text-[17px] text-on-warn'
                >
                  !
                </span>
              </span>
            ) : (
              <span className='verified-mark relative grid size-[72px] flex-none place-items-center rounded-full bg-signal shadow-[0_0_40px_rgba(61,255,136,0.25)]'>
                <CheckMark />
              </span>
            )}
            <div>
              <h2 className='mb-1 font-semibold text-xl tracking-[-0.015em]'>
                {risk ? copy.riskTitle : copy.title(claim.name)}
              </h2>
              {!risk && recoveredAfter !== null && (
                <p className='mb-1 text-[13px] text-signal'>{copy.recovered(recoveredAfter)}</p>
              )}
              <p className='mb-3.5 text-fg-3'>
                {risk ? copy.riskLine(since, claim.name) : copy.line}
              </p>
              {!risk && (
                <Link href={DOMAINS_PATH} className={BUTTON.regular}>
                  {copy.back}
                </Link>
              )}
            </div>
          </div>
        </Operator>
      </div>
    );
  },
);
VerifiedCard.displayName = 'VerifiedCard';
