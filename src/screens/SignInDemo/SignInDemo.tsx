// src/screens/SignInDemo/SignInDemo.tsx
'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ShownStep } from '@/client/check/checkReducer';
import Favicon from '@/components/Favicon/Favicon';
import Operator from '@/components/Operator/Operator';
import Pill from '@/components/Pill/Pill';
import type { ClaimDetailDTO } from '@/lib/claims/dto';
import { claimCopy } from '@/lib/claims/messages';
import type { Tone } from '@/lib/claims/row';
import { STEP_KEYS, type StepKey } from '@/lib/claims/steps';
import { claimScreenCopy } from '@/lib/copy/claim';
import { demoCopy } from '@/lib/copy/demo';
import { domainsCopy } from '@/lib/copy/domains';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import {
  CheckCard,
  NameserversCard,
  type Place,
  RecordCard,
  VerifiedCard,
} from '@/screens/ClaimScreen/Cards';
import Notice from '@/screens/ClaimScreen/Notice';
import { DEMO_HEIGHT, DEMO_WIDTH } from '@/screens/SignInDemo/config';

type PillState = { word: string; tone: Tone; busy: boolean };

type Frame = {
  screen: 'list' | 'claim';
  typed: string;
  focused: boolean;
  /** acme.dev is in the sidebar. */
  added: boolean;
  steps: ShownStep[];
  visible: [boolean, boolean, boolean, boolean];
  current: number;
  pill: PillState;
  live: boolean;
  result: 'none' | 'checking' | 'waiting';
  timer: string;
  verified: boolean;
  celebrate: boolean;
  copied: boolean;
  fade: boolean;
};

const step = (key: StepKey, state: ShownStep['state'], answer = ''): ShownStep => ({
  key,
  state,
  answer,
  fix: null,
  changed: true,
});

const QUEUED = STEP_KEYS.map((key) => step(key, 'queued'));

const PILL = {
  checking: { word: claimCopy.check.checking, tone: 'wait', busy: true },
  pending: { word: domainsCopy.row.pending, tone: 'wait', busy: false },
  verified: { word: domainsCopy.row.verified, tone: 'good', busy: false },
} satisfies Record<string, PillState>;

const START: Frame = {
  screen: 'list',
  typed: '',
  focused: false,
  added: false,
  steps: QUEUED,
  visible: [true, false, false, false],
  current: 0,
  pill: PILL.checking,
  live: false,
  result: 'none',
  timer: '',
  verified: false,
  celebrate: false,
  copied: false,
  fade: false,
};

/** The last frame, shown still when motion is reduced. */
const FINAL: Frame = {
  ...START,
  screen: 'claim',
  added: true,
  steps: STEP_KEYS.map((key) =>
    step(key, 'done', key === 'record' ? demoCopy.answers.record : demoCopy.answers[key]),
  ),
  visible: [true, true, true, true],
  current: 3,
  pill: PILL.verified,
  verified: true,
};

const claimFor = (verified: boolean): ClaimDetailDTO => ({
  id: 'demo',
  name: demoCopy.name,
  status: verified ? 'verified' : 'pending',
  issuedAt: '2026-09-24T10:24:00Z',
  expiresAt: '2026-10-01T10:24:00Z',
  verifiedAt: verified ? '2026-09-24T10:31:00Z' : null,
  failingSince: null,
  actionNeededSince: null,
  lastCheckedAt: null,
  dnsHost: demoCopy.host,
  dnsPanelUrl: 'https://dash.cloudflare.com/',
  record: {
    type: 'TXT',
    host: '_domainclaim-challenge',
    fullName: `_domainclaim-challenge.${demoCopy.name}`,
    value: demoCopy.token,
  },
  heldByAnother: false,
});

const Cursor: React.FC<{ x: number; y: number; shown: boolean; clicks: number }> = ({
  x,
  y,
  shown,
  clicks,
}) => (
  <div
    className={`demo-cursor absolute top-0 left-0 z-30 size-[22px] ${shown ? '' : 'opacity-0'}`}
    style={{ transform: `translate(${x}px, ${y}px)` }}
  >
    <svg width='22' height='22' viewBox='0 0 22 22' aria-hidden='true'>
      <path
        d='M3 2l14 8.2-6.2 1.3L8 18z'
        fill='#e6e6e2'
        stroke='#0a0a0b'
        strokeWidth='1.3'
        strokeLinejoin='round'
      />
    </svg>
    {clicks > 0 && <span key={clicks} className='demo-click' />}
  </div>
);

/**
 * A small copy of the app playing one claim: type a name, watch the nameservers pass, copy the
 * record, check once too early, then watch it verify. Built from the real cards with made-up data.
 *
 * Runs only while the page is visible. With reduced motion it shows the verified claim, still.
 * Never says "No record found yet" while steps are passing: the waiting notice goes before the
 * check that finds the record starts.
 */
const SignInDemo: React.FC = () => {
  const [frame, setFrame] = useState<Frame>(START);
  const [cursor, setCursor] = useState({ x: 700, y: 560, shown: false, clicks: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<HTMLSpanElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const cardRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [shift, setShift] = useState(0);

  // Keep the current card at the top of the column, the way the claim screen scrolls.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the refs are stable
  useEffect(() => {
    const card = cardRefs[frame.current]?.current;
    const col = colRef.current;
    if (card === null || card === undefined || col === null) {
      setShift(0);
      return;
    }
    // Summed up to the column, since a card's wrapper is its offset parent while it slides in.
    let top = 0;
    let node: HTMLElement | null = card;
    while (node !== null && node !== col) {
      top += node.offsetTop;
      const parent: Element | null = node.offsetParent;
      node = parent instanceof HTMLElement ? parent : null;
    }
    setShift(Math.max(0, top - 14));
  }, [frame.current, frame.visible]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the script runs once, and reads refs
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(FINAL);
      return;
    }

    let generation = 0;
    let running = false;
    const set = (patch: Partial<Frame> | ((f: Frame) => Partial<Frame>)) =>
      setFrame((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
    const wait = (ms: number, g: number) =>
      new Promise<void>((resolve, reject) =>
        setTimeout(() => (g === generation ? resolve() : reject(new Error('stop'))), ms),
      );
    const moveTo = (el: Element | null) => {
      const stage = stageRef.current;
      if (el === null || stage === null) {
        return;
      }
      const r = el.getBoundingClientRect();
      const b = stage.getBoundingClientRect();
      setCursor((c) => ({
        ...c,
        shown: true,
        x: r.left - b.left + r.width * 0.55,
        y: r.top - b.top + r.height * 0.55,
      }));
    };
    const click = async (el: Element | null, g: number) => {
      setCursor((c) => ({ ...c, clicks: c.clicks + 1 }));
      el?.classList.add('demo-press');
      await wait(160, g);
      el?.classList.remove('demo-press');
    };
    const hide = () => setCursor((c) => ({ ...c, shown: false }));
    const land = (index: number, state: ShownStep['state'], answer: string) =>
      set((f) => ({
        steps: f.steps.map((s, i) => (i === index ? step(s.key, state, answer) : s)),
      }));
    const run = (index: number) =>
      set((f) => ({
        steps: f.steps.map((s, i) =>
          i === index ? step(s.key, 'run', claimScreenCopy.running[s.key]) : s,
        ),
      }));
    const valueCopyButton = () =>
      cardRefs[1]?.current?.querySelector(`button[aria-label*="${claimCopy.record.valueLabel}"]`) ??
      null;

    const play = async (g: number) => {
      setFrame(START);
      setCursor({ x: 700, y: 560, shown: false, clicks: 0 });
      await wait(300, g);

      // 1. Claim a domain.
      moveTo(inputRef.current);
      await wait(650, g);
      set({ focused: true });
      for (let n = 1; n <= demoCopy.name.length; n += 1) {
        set({ typed: demoCopy.name.slice(0, n) });
        await wait(80, g);
      }
      await wait(250, g);
      moveTo(claimRef.current);
      await wait(650, g);
      await click(claimRef.current, g);

      // 2. The claim screen. The nameservers pass.
      set({ screen: 'claim', added: true, live: false });
      hide();
      await wait(450, g);
      for (const index of [0, 1]) {
        run(index);
        await wait(420, g);
        land(index, 'done', index === 0 ? demoCopy.answers.zone : demoCopy.answers.nameservers);
        await wait(160, g);
      }
      await wait(350, g);
      set({ visible: [true, true, false, false], current: 1, pill: PILL.pending });
      await wait(700, g);

      // 3. Copy the value.
      moveTo(valueCopyButton());
      await wait(700, g);
      await click(valueCopyButton(), g);
      set({ copied: true });
      await wait(900, g);
      set({ copied: false });

      // 4. Check too early: nothing there yet.
      moveTo(checkRef.current);
      await wait(650, g);
      await click(checkRef.current, g);
      hide();
      set({
        visible: [true, true, true, false],
        current: 2,
        pill: PILL.checking,
        live: true,
        result: 'checking',
        timer: claimScreenCopy.timer.checkingNow,
      });
      await wait(300, g);
      run(2);
      await wait(450, g);
      land(2, 'wait', demoCopy.answers.recordWait);
      set({ live: false, result: 'waiting', pill: PILL.pending });
      for (let left = 5; left >= 1; left -= 1) {
        set({ timer: demoCopy.next(left) });
        await wait(480, g);
      }

      // 5. The record is there. The waiting notice goes before any step passes.
      set({
        result: 'checking',
        live: true,
        pill: PILL.checking,
        timer: claimScreenCopy.timer.checkingNow,
      });
      const answers = [demoCopy.answers.record, demoCopy.answers.token, demoCopy.answers.claim];
      for (const [offset, index] of [2, 3, 4].entries()) {
        run(index);
        await wait(450, g);
        land(index, 'done', answers[offset] ?? '');
        await wait(200, g);
      }
      set({ result: 'none', live: false, timer: '' });

      // 6. Verified.
      await wait(300, g);
      set({
        visible: [true, true, true, true],
        current: 3,
        verified: true,
        celebrate: true,
        pill: PILL.verified,
      });
      await wait(2600, g);
      set({ fade: true });
      await wait(600, g);
    };

    const loop = async () => {
      if (running) {
        return;
      }
      running = true;
      while (document.visibilityState === 'visible') {
        generation += 1;
        try {
          await play(generation);
        } catch {
          break;
        }
      }
      running = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loop();
      } else {
        generation += 1;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    void loop();
    return () => {
      generation += 1;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const claim = claimFor(frame.verified);
  const place = (index: number): Place => (index < frame.current ? 'past' : 'current');
  const onClaim = frame.screen === 'claim';
  const rowCount = demoCopy.listed.length;

  return (
    <div
      ref={stageRef}
      className={`relative overflow-hidden bg-bg text-fg transition-opacity duration-500 ${frame.fade ? 'opacity-0' : ''}`}
      style={{ width: DEMO_WIDTH, height: DEMO_HEIGHT }}
    >
      {/* Sidebar */}
      <div className='absolute top-0 bottom-0 left-0 z-10 flex w-14 flex-col items-center gap-1.5 border-line border-r bg-bg pt-[62px]'>
        {demoCopy.listed.map((row) => (
          <Favicon key={row.name} badge={row.status === 'pending' ? 'clock' : null} />
        ))}
        {frame.added && (
          <span className='enter-up rounded-lg bg-surface'>
            <Favicon badge={frame.verified ? null : 'clock'} ring='surface' />
          </span>
        )}
      </div>

      {/* Top bar */}
      <div className='absolute top-0 right-0 left-14 z-10 flex h-13 items-center gap-2.5 border-line border-b bg-[rgb(10_10_11/0.82)] px-9 text-[13px]'>
        <span className={onClaim ? 'text-fg-3' : 'text-fg'}>{domainsCopy.heading}</span>
        {onClaim && (
          <>
            <span className='text-fg-5'>/</span>
            <span className='font-medium font-mono text-fg'>{demoCopy.name}</span>
          </>
        )}
        <span className='ml-auto flex items-center gap-2.5 text-[12.5px] text-fg-3'>
          {demoCopy.user}
          <span className='grid size-[26px] place-items-center rounded-full border border-line-control bg-[linear-gradient(135deg,#2a2a2e,#1a1a1d)] font-medium font-mono text-[10px] text-fg'>
            {demoCopy.user.slice(0, 2).toUpperCase()}
          </span>
        </span>
      </div>

      <div className='absolute top-13 right-0 bottom-0 left-14 overflow-hidden'>
        {/* The domain list */}
        <div
          className={`demo-screen absolute inset-0 px-9 pt-[34px] ${onClaim ? '-translate-x-[70px] opacity-0' : ''}`}
        >
          <h1 className='mb-[22px] font-semibold text-[30px] tracking-[-0.02em]'>
            {domainsCopy.heading}
          </h1>
          <Operator
            label={domainsCopy.input.card}
            badge={domainsCopy.input.badge}
            className='mb-[18px]'
          >
            <div className='flex gap-2 px-[18px] pt-4 pb-4'>
              <div
                ref={inputRef}
                className='flex h-10 w-full items-center rounded-[7px] border border-line-control bg-bg px-3 font-mono text-sm'
              >
                {frame.typed}
                {frame.focused && <span className='demo-caret' />}
                {frame.typed === '' && !frame.focused && (
                  <span className='text-fg-5'>{domainsCopy.input.placeholder}</span>
                )}
              </div>
              <span
                ref={claimRef}
                className='inline-flex h-10 flex-none items-center rounded-[7px] border border-signal bg-signal px-[18px] font-medium text-[13px] text-on-signal'
              >
                {domainsCopy.input.submit}
              </span>
            </div>
          </Operator>
          <Operator label={domainsCopy.list.card} badge={rowCount}>
            <ul>
              {demoCopy.listed.map((row) => (
                <li
                  key={row.name}
                  className='grid h-16 grid-cols-[36px_minmax(0,1fr)_150px_130px_16px] items-center gap-4 border-line border-t px-[18px] first:border-t-0'
                >
                  <Favicon badge={row.status === 'pending' ? 'clock' : null} />
                  <span className='min-w-0'>
                    <b className='block font-medium text-[14.5px]'>{row.name}</b>
                    <span className='font-mono text-[11.5px] text-fg-5'>
                      {domainsCopy.list.dnsAt(row.host)}
                    </span>
                  </span>
                  <span>
                    <Pill tone={row.status === 'pending' ? 'wait' : 'good'}>
                      {row.status === 'pending'
                        ? domainsCopy.row.pending
                        : domainsCopy.row.verified}
                    </Pill>
                  </span>
                  <span className='text-[12.5px] text-fg-3'>{row.meta}</span>
                  <span className='text-fg-5'>›</span>
                </li>
              ))}
            </ul>
          </Operator>
        </div>

        {/* The claim */}
        <div
          className={`demo-screen absolute inset-0 ${onClaim ? '' : 'translate-x-[70px] opacity-0'}`}
        >
          <div className='absolute top-0 right-0 left-0 z-10 bg-bg px-9 pt-[26px] pb-4'>
            <div className='flex items-center gap-3.5'>
              <h1 className='font-semibold text-[30px] leading-[1.2] tracking-[-0.02em]'>
                {demoCopy.name}
              </h1>
              <Pill tone={frame.pill.tone} busy={frame.pill.busy}>
                {frame.pill.word}
              </Pill>
            </div>
            <p className='mt-1.5 text-[12.5px] text-fg-5'>{demoCopy.claimed}</p>
          </div>
          <div className='absolute top-[112px] right-0 bottom-0 left-0 overflow-hidden'>
            <div
              ref={colRef}
              className='demo-col absolute right-9 left-9 flex flex-col gap-5 pt-3.5'
              style={{ transform: `translateY(${-shift}px)` }}
            >
              <NameserversCard
                ref={cardRefs[0]}
                place={place(0)}
                steps={frame.steps.slice(0, 2)}
                probe={null}
                dnsHost={demoCopy.host}
                result={null}
              />
              {frame.visible[1] && (
                <div className='enter-up'>
                  <RecordCard
                    ref={cardRefs[1]}
                    place={place(1)}
                    claim={claim}
                    notes={null}
                    gate={
                      <div className='mt-4 flex items-center gap-4'>
                        <span ref={checkRef} className={BUTTON.primary}>
                          {claimCopy.check.now}
                        </span>
                        <span className='font-mono text-[12px] text-fg-3'>
                          {frame.copied ? demoCopy.copied : frame.timer}
                        </span>
                      </div>
                    }
                  />
                </div>
              )}
              {frame.visible[2] && (
                <div className='enter-up'>
                  <CheckCard
                    ref={cardRefs[2]}
                    place={place(2)}
                    steps={frame.steps.slice(2)}
                    probe={null}
                    live={frame.live}
                    result={
                      frame.result === 'checking' ? (
                        <Notice tone='live' title={claimScreenCopy.result.checking(demoCopy.name)}>
                          <p className='text-[13px] text-fg-3'>
                            {claimScreenCopy.result.checkingText(demoCopy.host)}
                          </p>
                        </Notice>
                      ) : frame.result === 'waiting' ? (
                        <Notice tone='wait' title={claimScreenCopy.result.waitingTitle}>
                          <p className='mb-2 text-[13px] text-fg-3'>
                            {claimScreenCopy.result.waitingText}
                          </p>
                          <p className='font-mono text-[12px] text-fg-3'>{frame.timer}</p>
                        </Notice>
                      ) : null
                    }
                  />
                </div>
              )}
              {frame.visible[3] && (
                <div className='enter-up'>
                  <VerifiedCard
                    ref={cardRefs[3]}
                    place={place(3)}
                    claim={claim}
                    celebrate={frame.celebrate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Cursor {...cursor} />
    </div>
  );
};

export default SignInDemo;
