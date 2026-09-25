// src/screens/ClaimScreen/ClaimScreen.tsx
'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { CLAIMS_KEY, claimKey, createClaim, releaseClaim } from '@/client/api';
import { probeIndex, type ShownStep, stoppedIn } from '@/client/check/checkReducer';
import { useClaimCheck } from '@/client/check/useClaimCheck';
import { useClaim } from '@/client/queries';
import { shell } from '@/client/shellStore';
import { useNow } from '@/client/useNow';
import { DOMAINS_PATH } from '@/lib/claims/config';
import type { ClaimDetailDTO, ClaimDTO } from '@/lib/claims/dto';
import { claimCopy } from '@/lib/claims/messages';
import { claimRowView, type Tone } from '@/lib/claims/row';
import { cardsFor, checkCardEarned, nameserversPassed, recordKnown } from '@/lib/claims/screenView';
import { holdsTheName } from '@/lib/claims/state';
import { appCopy } from '@/lib/copy/app';
import { claimScreenCopy } from '@/lib/copy/claim';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import {
  CheckCard,
  CopyValueButton,
  NameserversCard,
  type Place,
  RecordCard,
  VerifiedCard,
} from '@/screens/ClaimScreen/Cards';
import CheckTimer from '@/screens/ClaimScreen/CheckTimer';
import ClaimHeader from '@/screens/ClaimScreen/ClaimHeader';
import FailureNotice from '@/screens/ClaimScreen/FailureNotice';
import Notice from '@/screens/ClaimScreen/Notice';
import OutArrow from '@/screens/ClaimScreen/OutArrow';
import ReleaseDialog from '@/screens/ClaimScreen/ReleaseDialog';
import Spine from '@/screens/ClaimScreen/Spine';

/** The top bar's height, which the sticky header sits under. */
const TOP_BAR = 52;
/** Space between the sticky header and the card scrolled to. */
const CARD_GAP = 16;

const TONE: Record<'good' | 'attention' | 'neutral', Tone> = {
  good: 'good',
  attention: 'warn',
  neutral: 'wait',
};

/** "14:32" in the person's own clock. */
const clockTime = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The notices above the record: a name another account holds, a reissued token. */
const RecordNotes: React.FC<{ claim: ClaimDetailDTO }> = ({ claim }) => {
  const params = useSearchParams();
  const copy = claimCopy.record;
  const notes: string[] = [];
  if (params.get('reissued') === '1') {
    notes.push(copy.reissued);
  } else if (params.get('existing') === '1') {
    notes.push(copy.existing);
  }
  if (claim.heldByAnother) {
    notes.push(copy.challenger(claim.name));
  }
  return (
    <>
      {notes.map((note) => (
        <p
          key={note}
          className='mb-4 rounded-md border border-wait/35 bg-wait/6 px-4 py-3 text-[13px] text-fg'
        >
          {note}
        </p>
      ))}
    </>
  );
};

/** The whole claim, from its first check to verified, as a sequence of cards. */
const ClaimScreen: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: claim, error } = useClaim(id);

  const [recordShown, setRecordShown] = useState(false);
  const [checkShown, setCheckShown] = useState(false);
  // Read by the check while it plays steps, which can be before the next render.
  const checkShownRef = useRef(false);
  checkShownRef.current = checkShownRef.current || checkShown;

  // Steps 03 to 05 only play when the check card is on screen.
  const check = useClaimCheck(claim, (index) => index < 2 || checkShownRef.current);
  const { state } = check;
  const now = useNow(30_000);
  const [releasing, setReleasing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Cards that have appeared this visit stay.
  useEffect(() => {
    if (claim !== undefined && (recordKnown(claim) || nameserversPassed(state.steps))) {
      setRecordShown(true);
    }
    if (claim !== undefined && checkCardEarned(claim, state.steps)) {
      setCheckShown(true);
    }
  }, [claim, state.steps]);

  // The verified moment, only when it happens while the screen is open.
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (claim === undefined) {
      return;
    }
    const before = lastStatus.current;
    lastStatus.current = claim.status;
    if (before === 'pending' && claim.status === 'verified') {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [claim]);

  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ref0 = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const cardRefs = useMemo(() => [ref0, ref1, ref2, ref3], []);
  const tailRef = useRef<HTMLDivElement>(null);

  const cards = cardsFor({
    status: claim?.status ?? 'pending',
    steps: state.steps,
    running: state.running,
    recordShown,
    checkShown,
  });
  const { visible, current } = cards;

  // Scroll so the current card sits under the header, with room below for it to get there.
  const firstScroll = useRef(true);
  const loaded = claim !== undefined;
  useEffect(() => {
    if (!loaded) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const card = cardRefs[current]?.current;
      const head = headRef.current;
      const body = bodyRef.current;
      if (card === null || card === undefined || head === null || body === null) {
        return;
      }
      const offset = TOP_BAR + head.offsetHeight + CARD_GAP;
      const cardTop = card.getBoundingClientRect().top + window.scrollY;
      const bodyBottom = body.getBoundingClientRect().bottom + window.scrollY;
      // Room under the last card, so the current one can reach the top. Set on the element before
      // scrolling, since a scroll past the end of the page is cut short.
      const spacer = tailRef.current;
      if (spacer !== null) {
        spacer.style.height = `${Math.max(0, window.innerHeight - offset - (bodyBottom - cardTop))}px`;
      }
      const top = current === 0 ? 0 : cardTop - offset;
      window.scrollTo({
        top,
        behavior: firstScroll.current || reducedMotion() ? 'auto' : 'smooth',
      });
      firstScroll.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [loaded, current, cardRefs]);

  // After a check someone watched, bring its result into view. It sits under the steps, often
  // below the fold, and it holds the one thing to do next.
  const resultRef = useRef<HTMLDivElement>(null);
  const nsResultRef = useRef<HTMLDivElement>(null);
  const wasLive = useRef(false);
  useEffect(() => {
    const live = state.running === 'live';
    const finished = wasLive.current && state.running === null;
    wasLive.current = live;
    if (!finished) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const el = nsResultRef.current ?? resultRef.current;
      const head = headRef.current;
      if (el === null || head === null) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const below = rect.bottom + CARD_GAP - window.innerHeight;
      if (below <= 0) {
        return;
      }
      // Never so far that the top of the result goes under the header.
      const room = rect.top - (TOP_BAR + head.offsetHeight + CARD_GAP);
      const by = Math.min(below, Math.max(0, room));
      if (by > 0) {
        window.scrollBy({ top: by, behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state.running]);

  const checkNow = useCallback(() => {
    checkShownRef.current = true;
    setCheckShown(true);
    check.checkNow();
  }, [check]);

  // An expired token is replaced on the same claim: claiming the name again reissues it.
  const [renewing, setRenewing] = useState(false);
  const renew = async () => {
    if (claim === undefined || renewing) {
      return;
    }
    setRenewing(true);
    try {
      const created = await createClaim(claim.name);
      if (created.ok) {
        await Promise.all([mutate(claimKey(claim.id)), mutate(CLAIMS_KEY)]);
        checkNow();
      }
    } finally {
      setRenewing(false);
    }
  };

  // Check now stays off until the check limit lets the next check through.
  const [limitOver, setLimitOver] = useState(true);
  useEffect(() => {
    if (state.error !== 'limited') {
      setLimitOver(true);
      return;
    }
    const wait = check.resumeAt === null ? 60_000 : check.resumeAt - Date.now();
    if (wait <= 0) {
      setLimitOver(true);
      return;
    }
    setLimitOver(false);
    const timer = setTimeout(() => setLimitOver(true), wait);
    return () => clearTimeout(timer);
  }, [state.error, check.resumeAt]);

  const release = async () => {
    if (claim === undefined) {
      return;
    }
    try {
      await releaseClaim(claim.id);
      shell.released(claim.name);
      await mutate<ClaimDTO[]>(CLAIMS_KEY, (list) => list?.filter((row) => row.id !== claim.id), {
        revalidate: false,
      });
      setReleasing(false);
      router.push(DOMAINS_PATH);
    } catch {
      setReleasing(false);
    }
  };

  // The pill is read on its own only on arrival. When a check changes the claim's state, say it.
  const [announced, setAnnounced] = useState('');
  const lastWord = useRef<string | null>(null);
  const viewWord = state.view?.status.label ?? null;
  useEffect(() => {
    if (viewWord === null || claim === undefined) {
      return;
    }
    if (lastWord.current !== null && lastWord.current !== viewWord) {
      setAnnounced(`${claim.name}: ${viewWord}`);
    }
    lastWord.current = viewWord;
  }, [viewWord, claim]);

  if (error !== undefined && claim === undefined) {
    return (
      <div className='page-wrap pt-[92px] max-[720px]:pt-7'>
        <h1 className='mb-2 font-semibold text-[26px]'>{appCopy.notFound.title}</h1>
        <p className='mb-5 text-fg-3'>{appCopy.notFound.note}</p>
        <Link href={DOMAINS_PATH} className={BUTTON.regular}>
          {claimScreenCopy.verified.back}
        </Link>
      </div>
    );
  }

  const live = state.running === 'live';
  const pill =
    claim === undefined
      ? null
      : live
        ? { word: claimCopy.check.checking, tone: 'wait' as const, busy: true }
        : state.view !== null
          ? { word: state.view.status.label, tone: TONE[state.view.status.tone], busy: false }
          : now === null
            ? null
            : { ...claimRowView(claim, now), busy: false };

  const place = (index: number): Place => (index < current ? 'past' : 'current');
  const probe =
    state.running !== 'background'
      ? null
      : current === 0
        ? probeIndex(state.steps, 0, 2)
        : current === 2 || visible[2]
          ? probeIndex(state.steps, 2, 5)
          : null;

  const checkButton = (small: boolean) => (
    <button
      type='button'
      onClick={checkNow}
      disabled={live || !limitOver}
      className={small ? BUTTON.primarySmall : BUTTON.primary}
    >
      {live
        ? claimCopy.check.checking
        : limitOver
          ? claimCopy.check.now
          : claimScreenCopy.result.limitReached}
    </button>
  );

  // Decided from the row, the same way the check decides it, since the step doesn't carry a reason.
  const expired =
    claim !== undefined &&
    !holdsTheName(claim.status) &&
    new Date(claim.expiresAt).getTime() <= Date.now();

  const timer = (
    <CheckTimer
      running={state.running !== null}
      nextAt={check.nextAt}
      lastAt={check.lastAt}
      stopped={check.stopped}
    />
  );

  // Card 01's result: the zone or its nameservers stopped the check.
  const nsStop = stoppedIn(state.steps, 0, 2);
  const nsResult =
    claim === undefined || nsStop === null || nsStop.fix === null ? null : (
      <FailureNotice
        message={nsStop.fix}
        tone={nsStop.state === 'wait' ? 'wait' : 'warn'}
        actions={
          expired ? (
            <button
              type='button'
              onClick={renew}
              disabled={renewing}
              className={BUTTON.primarySmall}
            >
              {renewing ? claimScreenCopy.result.gettingRecord : claimScreenCopy.result.newRecord}
            </button>
          ) : (
            <>
              {nsStop.key === 'zone' && (
                <a
                  href={`https://lookup.icann.org/en/lookup?name=${encodeURIComponent(claim.name)}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={BUTTON.small}
                >
                  {claimScreenCopy.result.findRegistrar}
                  <OutArrow />
                </a>
              )}
              {checkButton(true)}
            </>
          )
        }
      />
    );

  const checkResult = (() => {
    if (claim === undefined) {
      return null;
    }
    if (state.error !== null) {
      const base =
        state.error === 'not_found' ? claimCopy.check.missing : claimCopy.check[state.error];
      // The limit says when checks resume, so nothing counts down to a check that will be refused.
      const message =
        state.error === 'limited' && check.resumeAt !== null
          ? { ...base, action: claimCopy.check.limited.actionAt(clockTime(check.resumeAt)) }
          : base;
      return (
        <FailureNotice
          message={{ ...message, record: null, copyable: null }}
          tone={state.error === 'limited' ? 'warn' : 'wait'}
          actions={state.error === 'not_found' ? null : checkButton(true)}
        />
      );
    }
    if (live) {
      const copy = claimScreenCopy.result;
      return (
        <Notice tone='live' title={copy.checking(claim.name)}>
          <p className='mb-2.5 max-w-[720px] text-[13px] text-fg-3'>
            {claim.dnsHost === null ? copy.checkingTextUnknown : copy.checkingText(claim.dnsHost)}
          </p>
          <div className='mt-3.5 grid grid-cols-3 gap-2.5 max-[900px]:grid-cols-1'>
            {[
              [
                copy.asking,
                claim.dnsHost === null
                  ? claimCopy.steps.label.nameservers
                  : copy.nameservers(claim.dnsHost),
              ],
              [copy.lookingFor, `TXT ${claim.record.host}`],
              [copy.expecting, copy.token(claim.record.value.split(' ')[0]?.slice(-6) ?? '')],
            ].map(([label, value]) => (
              <div key={label} className='rounded-md border border-line px-3 py-2.5'>
                <span className='mb-1.5 block font-medium font-mono text-[9.5px] text-fg-5 uppercase tracking-[0.12em]'>
                  {label}
                </span>
                <b className='font-medium font-mono text-[12.5px]'>{value}</b>
              </div>
            ))}
          </div>
        </Notice>
      );
    }
    const stop: ShownStep | null = stoppedIn(state.steps, 2, 5);
    if (stop === null) {
      return null;
    }
    if (stop.key === 'record' && stop.state === 'wait') {
      const copy = claimScreenCopy.result;
      return (
        <Notice tone='wait' title={copy.waitingTitle}>
          <p className='mb-2.5 text-[13px] text-fg-3'>{copy.waitingText}</p>
          <p className='mt-3 flex items-center gap-2'>{timer}</p>
        </Notice>
      );
    }
    if (stop.fix === null) {
      return null;
    }
    return (
      <FailureNotice
        message={stop.fix}
        tone={stop.state === 'wait' ? 'wait' : 'warn'}
        actions={
          <>
            <CopyValueButton value={claim.record.value} />
            {checkButton(true)}
          </>
        }
      />
    );
  })();

  const gate =
    claim !== undefined && !holdsTheName(claim.status) ? (
      <div className='mt-4 flex flex-wrap items-center gap-4'>
        {checkButton(false)}
        {limitOver ? (
          timer
        ) : (
          <span className='font-mono text-[12px] text-fg-3'>
            {check.resumeAt === null
              ? claimCopy.check.limited.action
              : claimScreenCopy.result.resumesAt(clockTime(check.resumeAt))}
          </span>
        )}
      </div>
    ) : null;

  const layoutKey = `${visible.join()}-${current}-${state.steps.map((s) => s.state).join()}-${state.error}-${live}`;

  return (
    <div className='page-wrap pb-6'>
      {claim === undefined ? (
        // The header's own heights, so nothing moves when the claim arrives: the name, the pill
        // row on a phone, and the meta row as tall as the Open DNS button.
        <div className='pt-[92px] pb-[22px] max-[720px]:pt-7 max-[720px]:pb-4' aria-busy='true'>
          <div className='h-[41px] w-64 max-w-full rounded bg-surface-2 max-[720px]:h-7 max-[720px]:w-40' />
          <div className='mt-2 hidden h-6 w-20 rounded-full bg-surface-2 max-[720px]:block' />
          {/* On a phone the meta line usually wraps to two lines. */}
          <div className='mt-2.5 flex h-7 flex-col justify-center gap-1.5 max-[720px]:mt-2 max-[720px]:h-10'>
            <div className='h-4 w-80 max-w-full rounded bg-surface-2 max-[720px]:h-3.5' />
            <div className='hidden h-3.5 w-40 rounded bg-surface-2 max-[720px]:block' />
          </div>
        </div>
      ) : (
        <ClaimHeader
          ref={headRef}
          claim={claim}
          pill={pill}
          now={now}
          onRelease={() => setReleasing(true)}
        />
      )}

      <div ref={bodyRef} className='relative flex flex-col gap-[22px]'>
        {claim !== undefined && (
          <Spine
            container={bodyRef}
            cards={cardRefs}
            visible={visible}
            current={current}
            layoutKey={layoutKey}
          />
        )}
        <NameserversCard
          ref={ref0}
          place={place(0)}
          steps={state.steps.slice(0, 2)}
          probe={probe}
          dnsHost={claim?.dnsHost ?? null}
          result={nsResult === null ? null : <div ref={nsResultRef}>{nsResult}</div>}
        />
        {claim !== undefined && visible[1] && (
          <div className='enter-up'>
            <RecordCard
              ref={ref1}
              place={place(1)}
              claim={claim}
              notes={
                <Suspense fallback={null}>
                  <RecordNotes claim={claim} />
                </Suspense>
              }
              gate={gate}
            />
          </div>
        )}
        {claim !== undefined && visible[2] && (
          <div className='enter-up'>
            <CheckCard
              ref={ref2}
              place={place(2)}
              steps={state.steps.slice(2)}
              probe={probe}
              live={live}
              result={checkResult === null ? null : <div ref={resultRef}>{checkResult}</div>}
            />
          </div>
        )}
        {claim !== undefined && visible[3] && (
          <div className='enter-up'>
            <VerifiedCard ref={ref3} place={place(3)} claim={claim} celebrate={celebrate} />
          </div>
        )}
      </div>
      <div ref={tailRef} aria-hidden='true' />
      <p aria-live='polite' className='sr-only'>
        {announced}
      </p>

      {claim !== undefined && (
        <ReleaseDialog
          open={releasing}
          name={claim.name}
          fullName={claim.record.fullName}
          onCancel={() => setReleasing(false)}
          onConfirm={release}
        />
      )}
    </div>
  );
};

export default ClaimScreen;
