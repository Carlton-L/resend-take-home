// src/components/ClaimCheck/ClaimCheck.tsx
'use client';

import type React from 'react';
import { type CheckError, useCheck } from '@/components/CheckRunner/CheckRunner';
import ClaimCheckPending from '@/components/ClaimCheckPending/ClaimCheckPending';
import CopyField from '@/components/CopyField/CopyField';
import { claimCopy } from '@/lib/claims/messages';
import type { CheckStep } from '@/lib/claims/steps';

const GLYPHS = {
  done: 'text-green-700',
  wrong: 'text-red-800',
  wait: 'text-amber-700',
  idle: 'text-neutral-400',
} as const;

/**
 * The disclosure marker, drawn rather than inherited.
 *
 * A `summary` only gets the browser's own triangle while it is `display: list-item`. This one is a
 * flex row, which drops the marker in Chrome and Safari and leaves a line with no sign that it
 * opens. Someone opened it by accident, saw the rows, reloaded, and had no way to tell whether the
 * page had changed or they had.
 */
const Chevron: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 16 16'
    fill='none'
    className='size-3 shrink-0 text-neutral-400 transition-transform group-open:rotate-90 motion-reduce:transition-none'
  >
    <path
      d='m6 3.5 5 4.5-5 4.5'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

/** A tick, a cross, a ring or a dot. The ring rests, because this check has already answered. */
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

const PROBLEMS: Record<CheckError, { title: string; description: string; action: string }> = {
  limited: claimCopy.check.limited,
  unavailable: claimCopy.check.unavailable,
  offline: claimCopy.check.offline,
  signed_out: claimCopy.check.signedOut,
  not_found: claimCopy.check.missing,
};

/**
 * The check itself failing, which is a different thing from the check answering that DNS is wrong.
 *
 * Same four parts as every other failure, minus the DNS value, because there is no DNS answer to
 * show. Each one names the one way back, and for four of the five that way is the button above.
 */
const Problem: React.FC<{ error: CheckError }> = ({ error }) => {
  const problem = PROBLEMS[error];
  return (
    <div className='flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-4'>
      <p className='font-medium text-neutral-900 text-sm'>{problem.title}</p>
      <p className='text-neutral-700 text-sm leading-relaxed'>{problem.description}</p>
      <p className='font-medium text-neutral-900 text-sm leading-relaxed'>{problem.action}</p>
    </div>
  );
};

/**
 * The check, as the five questions it asked and what each one answered.
 *
 * One element in one place, at two densities. Closed it is a single line, which is what a claim
 * nobody has added a record for deserves. Open it is because something needs the person, or because
 * everything passed and five rows are the receipt.
 *
 * The element never appears or disappears once it has said anything, only its sentence changes.
 * Someone who fixed their nameservers and came back would otherwise have to tell "you fixed it"
 * apart from "we stopped looking", and an absence cannot say either.
 *
 * When the check ran and when it runs again are not here. They sit beside the button that asks
 * again, at the top of the page, which is where someone waiting is already looking.
 */
const ClaimCheck: React.FC = () => {
  const { view, error } = useCheck();
  const copy = claimCopy.steps;

  if (view === null) {
    return error === null ? <ClaimCheckPending /> : <Problem error={error} />;
  }

  const chain = view.needsAttention ? (
    <section className='overflow-hidden rounded-md border border-neutral-200 bg-white'>
      <div className='flex items-baseline justify-between gap-3 border-neutral-200 border-b px-5 py-2.5'>
        <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
          {copy.heading}
        </span>
        <span className='font-mono text-neutral-500 text-xs'>{copy.answered(view.answered)}</span>
      </div>
      <Rows steps={view.steps} />
    </section>
  ) : (
    <details className='group rounded-md border border-neutral-200 bg-white'>
      <summary className='flex cursor-pointer list-none items-center gap-3 px-5 py-3 text-neutral-600 text-sm [&::-webkit-details-marker]:hidden'>
        <Chevron />
        {copy.summary(copy.summaryThrough)}
      </summary>
      <div className='border-neutral-100 border-t'>
        <Rows steps={view.steps} />
      </div>
    </details>
  );

  if (error === null) {
    return chain;
  }

  // The last answer stays on screen under the problem. It is still the most recent thing DNS said,
  // and taking it away would leave the person with nothing but the failure to ask again.
  return (
    <div className='flex flex-col gap-4'>
      <Problem error={error} />
      {chain}
    </div>
  );
};

export default ClaimCheck;
