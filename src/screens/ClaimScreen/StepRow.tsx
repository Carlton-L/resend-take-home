// src/screens/ClaimScreen/StepRow.tsx
'use client';

import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ShownStep } from '@/client/check/checkReducer';
import Tip from '@/components/Tip/Tip';
import { claimCopy } from '@/lib/claims/messages';
import type { StepKey } from '@/lib/claims/steps';
import { claimScreenCopy } from '@/lib/copy/claim';

type StepRowProps = {
  steps: ShownStep[];
  /** Index of the first step in the row, for its number: 0 gives 01. */
  from: number;
  /** A background check is asking about this step. */
  probe: number | null;
};

const TIPS: Partial<Record<StepKey, keyof typeof claimScreenCopy.tips>> = {
  zone: 'zone',
  nameservers: 'nameservers',
};

const Tick: React.FC = () => (
  <svg aria-hidden='true' className='step-tick' width='12' height='12' viewBox='0 0 12 12'>
    <path
      d='M2.5 6.3l2.3 2.3 4.7-5'
      fill='none'
      stroke='#05140b'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const LANDED = new Set(['done', 'wait', 'wrong']);

/** What a step is, read out after its label. */
const stateWord = (state: ShownStep['state']): string =>
  state === 'run'
    ? claimScreenCopy.badge.running
    : state === 'queued'
      ? claimScreenCopy.queued
      : claimCopy.steps.state[state];

/**
 * A row of steps on one straight cable. The fill runs to the last step that passed, and off the
 * end only when every step in the row passed. The step the check is on gets a lead-in in its own
 * colour. A pulse runs along the segment being asked: once, arriving as the step lands, while a
 * check is revealed, and on a loop while a background check waits for its answer.
 */
/**
 * The step a background check is asking about, held until its pulse finishes the run it is on. A
 * check often answers in a few hundred milliseconds, and dropping the pulse then cut it off part
 * way along the cable.
 */
const useFinishedProbe = (probe: number | null) => {
  const [shown, setShown] = useState(probe);
  useEffect(() => {
    if (probe !== null) {
      setShown(probe);
      return;
    }
    // Nothing plays with reduced motion, so there is no run to wait for.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(null);
    }
  }, [probe]);
  const finished = () => {
    if (probe === null) {
      setShown(null);
    }
  };
  return { shown, finished };
};

const PHONE = '(max-width: 720px)';

/**
 * On a phone a row scrolls sideways instead of stacking, the way the design has it. Every column
 * is as wide as its longest label or answer, so each stays on one line, and the row scrolls to
 * the step the check is on. `more` says which ends have steps out of view, for the fade.
 */
const usePhoneRow = (steps: ShownStep[]) => {
  const rowRef = useRef<HTMLOListElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const current = (() => {
    const running = steps.findIndex((step) => step.state === 'run');
    if (running >= 0) {
      return running;
    }
    const open = steps.findIndex((step) => step.state !== 'done');
    return open >= 0 ? open : steps.length - 1;
  })();
  const text = steps.map((step) => `${step.state}:${step.answer}`).join('|');

  // biome-ignore lint/correctness/useExhaustiveDependencies: `text` stands for what changes the widths
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) {
      return;
    }
    const phone = window.matchMedia(PHONE);
    const measure = () => {
      if (!phone.matches) {
        setWidth(null);
        return;
      }
      let widest = 0;
      for (const el of row.querySelectorAll<HTMLElement>('.step-label, .step-answer')) {
        widest = Math.max(widest, el.scrollWidth);
      }
      setWidth(Math.max(150, Math.ceil(widest) + 32));
    };
    measure();
    phone.addEventListener('change', measure);
    return () => phone.removeEventListener('change', measure);
  }, [text]);

  useEffect(() => {
    const row = rowRef.current;
    if (row === null || width === null) {
      return;
    }
    const hint = () =>
      setMore({
        left: row.scrollLeft > 4,
        right: row.scrollLeft + row.clientWidth < row.scrollWidth - 4,
      });
    const node = row.children[current + 1];
    if (node instanceof HTMLElement) {
      const left = node.offsetLeft - (row.clientWidth - node.offsetWidth) / 2;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }
    hint();
    row.addEventListener('scroll', hint, { passive: true });
    return () => row.removeEventListener('scroll', hint);
  }, [current, width]);

  return { rowRef, width, more };
};

const FADE = {
  none: '',
  left: '[mask-image:linear-gradient(90deg,transparent,#000_20%)]',
  right: '[mask-image:linear-gradient(90deg,#000_80%,transparent)]',
  both: '[mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]',
};

const StepRow: React.FC<StepRowProps> = ({ steps, from, probe }) => {
  const held = useFinishedProbe(probe);
  const phone = usePhoneRow(steps);
  const count = steps.length;
  const centre = (k: number) => (k + 0.5) * (100 / count);

  let passed = -1;
  while (passed + 1 < count && steps[passed + 1]?.state === 'done') {
    passed += 1;
  }
  const fill = passed === count - 1 ? 100 : passed < 0 ? 0 : centre(passed);

  const at = passed + 1;
  const atState = steps[at]?.state;
  const leadStart = at === 0 ? 0 : centre(at - 1);
  const lead =
    at < count && (atState === 'wait' || atState === 'wrong')
      ? { left: leadStart, width: centre(at) - leadStart, tone: atState }
      : null;

  const runAt = steps.findIndex((step) => step.state === 'run');
  const pulseAt = runAt >= 0 ? runAt : held.shown === null ? -1 : held.shown - from;
  const pulseStart = pulseAt <= 0 ? 0 : centre(pulseAt - 1);
  // The probe index counts all five steps, so a probe in the other row lands outside this one.
  const pulse =
    pulseAt >= 0 && pulseAt < count
      ? { left: pulseStart, width: centre(pulseAt) - pulseStart }
      : null;

  return (
    <div className='pt-[26px] pb-1 max-[720px]:pt-5'>
      <ol
        ref={phone.rowRef}
        className={`relative grid list-none ${count === 2 ? 'grid-cols-2' : 'grid-cols-3'} max-[720px]:snap-x max-[720px]:snap-proximity max-[720px]:overflow-x-auto max-[720px]:overflow-y-hidden max-[720px]:overscroll-x-contain max-[720px]:[scrollbar-width:none] max-[720px]:[&::-webkit-scrollbar]:hidden max-[720px]:-my-4 max-[720px]:py-4 max-[720px]:[&_[role=tooltip]]:hidden ${FADE[phone.more.left ? (phone.more.right ? 'both' : 'left') : phone.more.right ? 'right' : 'none']}`}
        style={
          phone.width === null
            ? undefined
            : { gridTemplateColumns: `repeat(${count}, ${phone.width}px)` }
        }
      >
        <li
          aria-hidden='true'
          className='absolute top-[13px] left-0 h-0.5 bg-line-control max-[720px]:top-[29px]'
          style={phone.width === null ? { right: 0 } : { width: count * phone.width }}
        >
          <span className='cable-fill absolute top-0 left-0 h-full' style={{ width: `${fill}%` }} />
          {lead !== null && (
            <span
              className='cable-lead absolute top-0 h-full'
              data-tone={lead.tone}
              style={{ left: `${lead.left}%`, width: `${lead.width}%` }}
            />
          )}
          {pulse !== null && (
            <span
              // Keyed on the step, so the pulse starts again from the left for each one.
              key={`${pulseAt}-${runAt >= 0 ? 'run' : 'probe'}`}
              className='absolute top-0 h-full'
              style={{ left: `${pulse.left}%`, width: `${pulse.width}%` }}
            >
              <span
                className={`cable-pulse ${runAt >= 0 ? 'cable-pulse-once' : ''}`}
                // A probe loops while the check runs, and stops at the end of the run it is on.
                onAnimationIteration={runAt >= 0 ? undefined : held.finished}
              />
            </span>
          )}
        </li>
        {steps.map((step, offset) => {
          const index = from + offset;
          const tip = TIPS[step.key];
          const label = claimCopy.steps.label[step.key];
          const pop = step.changed && LANDED.has(step.state);
          return (
            <li
              // Keyed on the state, so a step that lands replays its pop.
              key={`${step.key}-${step.state}`}
              data-state={step.state}
              className={`step flex min-w-0 flex-col items-center px-3 text-center max-[720px]:snap-center ${pop ? 'step-pop' : ''} ${probe === index ? 'step-probe' : ''}`}
            >
              <span aria-hidden='true' className='step-node'>
                <Tick />
                <span className='step-bang'>!</span>
                <span className='step-wait' />
              </span>
              <span className='step-number mt-3 font-medium font-mono text-[10.5px] text-fg-5 tracking-[0.1em]'>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className='step-label mt-[3px] font-medium text-[13px] text-fg-3 transition-colors max-[720px]:whitespace-nowrap'>
                {tip === undefined ? (
                  label
                ) : (
                  <Tip term={claimScreenCopy.tipTerms[tip]} text={claimScreenCopy.tips[tip]}>
                    {label}
                  </Tip>
                )}
                <span className='sr-only'>, {stateWord(step.state)}</span>
              </span>
              <span className='step-answer mt-1 min-h-[38px] text-[12.5px] text-fg-5 leading-normal transition-colors max-[720px]:min-h-5 max-[720px]:whitespace-nowrap'>
                {step.answer}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default StepRow;
