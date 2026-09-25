// src/screens/ClaimScreen/StepRow.tsx
'use client';

import type React from 'react';
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
const StepRow: React.FC<StepRowProps> = ({ steps, from, probe }) => {
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
  const pulseAt = runAt >= 0 ? runAt : probe === null ? -1 : probe - from;
  const pulseStart = pulseAt <= 0 ? 0 : centre(pulseAt - 1);
  const pulse = pulseAt >= 0 ? { left: pulseStart, width: centre(pulseAt) - pulseStart } : null;

  return (
    <div className='pt-[26px] pb-1 max-[720px]:pt-5'>
      <ol
        className={`relative grid list-none max-[720px]:grid-cols-1 max-[720px]:gap-3 max-[720px]:px-[18px] ${count === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
      >
        <li
          aria-hidden='true'
          className='absolute top-[13px] right-0 left-0 h-0.5 bg-line-control max-[720px]:hidden'
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
              <span className={`cable-pulse ${runAt >= 0 ? 'cable-pulse-once' : ''}`} />
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
              className={`step flex min-w-0 flex-col items-center px-3 text-center max-[720px]:grid max-[720px]:grid-cols-[28px_1fr] max-[720px]:items-start max-[720px]:gap-x-3 max-[720px]:px-0 max-[720px]:text-left ${pop ? 'step-pop' : ''} ${probe === index ? 'step-probe' : ''}`}
            >
              <span aria-hidden='true' className='step-node max-[720px]:row-span-3'>
                <Tick />
                <span className='step-bang'>!</span>
                <span className='step-wait' />
              </span>
              <span className='step-number mt-3 font-medium font-mono text-[10.5px] text-fg-5 tracking-[0.1em] max-[720px]:mt-0'>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className='step-label mt-[3px] font-medium text-[13px] text-fg-3 transition-colors'>
                {tip === undefined ? (
                  label
                ) : (
                  <Tip term={claimScreenCopy.tipTerms[tip]} text={claimScreenCopy.tips[tip]}>
                    {label}
                  </Tip>
                )}
                <span className='sr-only'>, {stateWord(step.state)}</span>
              </span>
              <span className='step-answer mt-1 min-h-[38px] text-[12.5px] text-fg-5 leading-normal transition-colors max-[720px]:min-h-5'>
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
