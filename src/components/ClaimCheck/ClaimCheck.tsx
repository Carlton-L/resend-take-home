// src/components/ClaimCheck/ClaimCheck.tsx
import type React from 'react';
import CopyField from '@/components/CopyField/CopyField';
import type { ClaimOutcome } from '@/lib/claims/check';
import { claimCopy } from '@/lib/claims/messages';
import { answeredCount, type CheckStep, needsAttention, stepsFor } from '@/lib/claims/steps';

type ClaimCheckProps = {
  /**
   * The check, awaited here rather than started here. The page creates it once and gives the same
   * promise to the status block and the provider line, so one trace and one write feed all three.
   */
  outcome: Promise<ClaimOutcome>;
};

const GLYPHS = {
  done: 'text-green-700',
  wrong: 'text-red-800',
  wait: 'text-amber-700',
  idle: 'text-neutral-400',
} as const;

/** A tick, a cross, a ring or a dot. The ring rests, because the check is not running. */
const Glyph: React.FC<{ state: CheckStep['state'] }> = ({ state }) => {
  if (state === 'wait') {
    return (
      <span
        aria-hidden='true'
        className='mt-0.5 size-3 shrink-0 rounded-full border-[1.5px] border-amber-500'
      />
    );
  }
  if (state === 'idle') {
    return (
      <span aria-hidden='true' className='mt-1.5 size-1 shrink-0 rounded-full bg-neutral-300' />
    );
  }
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 16 16'
      fill='none'
      strokeWidth='1.75'
      className={`mt-0.5 size-3.5 shrink-0 ${GLYPHS[state]}`}
    >
      {state === 'done' ? (
        <path
          d='m3 8.5 3.25 3.25L13 5'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      ) : (
        <path d='M4 4l8 8M12 4l-8 8' stroke='currentColor' strokeLinecap='round' />
      )}
    </svg>
  );
};

/** The four parts, in the row that owns them rather than in a box of their own below. */
const Fix: React.FC<{ step: CheckStep }> = ({ step }) => {
  if (step.fix === null) {
    return null;
  }
  const { fix } = step;
  return (
    <div className='flex flex-col gap-3 border-red-100 border-b bg-red-50/60 px-5 pt-1 pb-4 sm:pl-12'>
      {fix.record !== null && (
        <div className='flex flex-col gap-0.5'>
          <span className='font-medium text-red-900 text-xs uppercase tracking-wider'>
            {fix.record.label}
          </span>
          <ul className='flex flex-col gap-0.5'>
            {fix.record.values.map((value) => (
              <li key={value} className='break-all font-mono text-neutral-900 text-sm'>
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className='text-neutral-700 text-sm leading-relaxed'>{fix.description}</p>
      {fix.copyable !== null && (
        <div className='max-w-md'>
          <CopyField label={fix.copyable.label} value={fix.copyable.value} />
        </div>
      )}
      <p className='font-medium text-neutral-900 text-sm leading-relaxed'>{fix.action}</p>
    </div>
  );
};

const Rows: React.FC<{ steps: CheckStep[] }> = ({ steps }) => (
  <>
    {steps.map((step) => (
      <div key={step.key}>
        <div
          className={`grid grid-cols-[1rem_1fr] items-start gap-x-3 gap-y-0.5 border-neutral-100 border-b px-5 py-2 text-sm sm:grid-cols-[1rem_11rem_1fr] ${
            step.state === 'wrong' ? 'bg-red-50/60 border-red-100' : ''
          }`}
        >
          <Glyph state={step.state} />
          <span className={step.state === 'idle' ? 'text-neutral-400' : 'text-neutral-900'}>
            {claimCopy.steps.label[step.key]}
          </span>
          <span
            className={`col-start-2 break-words font-mono text-xs leading-5 sm:col-start-3 ${
              step.state === 'wrong'
                ? 'text-red-800'
                : step.state === 'wait'
                  ? 'text-amber-800'
                  : step.state === 'idle'
                    ? 'text-neutral-400'
                    : 'text-neutral-600'
            }`}
          >
            {step.answer}
          </span>
        </div>
        <Fix step={step} />
      </div>
    ))}
  </>
);

/**
 * The check, as the five questions it asked and what each one answered.
 *
 * One element in one place, at two densities. Closed it is a single line, which is what a claim
 * nobody has added a record for deserves. Open it is because something needs the person, or because
 * everything passed and five rows are the receipt.
 *
 * The element never appears or disappears, only its sentence changes. Someone who fixed their
 * nameservers and came back would otherwise have to tell "you fixed it" apart from "we stopped
 * looking", and an absence cannot say either.
 */
const ClaimCheck: React.FC<ClaimCheckProps> = async ({ outcome }) => {
  const steps = stepsFor(await outcome);
  const copy = claimCopy.steps;

  if (!needsAttention(steps)) {
    return (
      <details className='rounded-md border border-neutral-200 bg-white'>
        <summary className='flex cursor-pointer items-center gap-3 px-5 py-3 text-neutral-600 text-sm marker:text-neutral-400'>
          {copy.summary(copy.summaryThrough)}
        </summary>
        <div className='border-neutral-100 border-t'>
          <Rows steps={steps} />
        </div>
      </details>
    );
  }

  return (
    <section className='overflow-hidden rounded-md border border-neutral-200 bg-white'>
      <div className='flex items-baseline justify-between gap-3 border-neutral-200 border-b px-5 py-2.5'>
        <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
          {copy.heading}
        </span>
        <span className='font-mono text-neutral-500 text-xs'>
          {copy.answered(answeredCount(steps))}
        </span>
      </div>
      <Rows steps={steps} />
    </section>
  );
};

export default ClaimCheck;
