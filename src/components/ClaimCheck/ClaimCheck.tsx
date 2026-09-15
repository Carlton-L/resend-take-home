// src/components/ClaimCheck/ClaimCheck.tsx
'use client';

import type React from 'react';
import { type CheckError, useCheck } from '@/components/CheckRunner/CheckRunner';
import ClaimCheckPending from '@/components/ClaimCheckPending/ClaimCheckPending';
import CopyField from '@/components/CopyField/CopyField';
import { claimCopy } from '@/lib/claims/messages';
import type { CheckStep } from '@/lib/claims/steps';

const GLYPHS = {
  done: 'text-good-fg',
  wrong: 'text-wrong-fg',
  wait: 'text-attention-glyph',
  idle: 'text-fg-4',
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
    className='size-3 shrink-0 text-fg-4 transition-transform group-open:rotate-90 motion-reduce:transition-none'
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
        className='mt-0.5 size-3 shrink-0 rounded-full border-[1.5px] border-attention-glyph'
      />
    );
  }
  if (state === 'idle') {
    return <span aria-hidden='true' className='mt-1.5 size-1 shrink-0 rounded-full bg-line-2' />;
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

/**
 * The four parts, in the row that owns them rather than in a box of their own below.
 *
 * Action first. The thing to do matters more than why, and the copyable value sits between them
 * so it reads as instruction, thing to paste, reason. A waiting step gets the attention tone,
 * because its fix is advice for later rather than a change to make now.
 */
/*
 * A tinted row also carries a 3px stripe in the tone colour and, in the fix panel, the state word
 * in that colour. The two tints are both near black and differ mostly by hue, and for red-green
 * colour vision the hues themselves drift together, so the stripe and the word are the channels
 * that survive when the tint does not.
 */
const FIX_TONES = {
  wrong: 'border-wrong-line bg-wrong-bg shadow-[inset_3px_0_0_var(--color-wrong-fg)]',
  wait: 'border-attention-line bg-attention-bg shadow-[inset_3px_0_0_var(--color-attention-glyph)]',
} as const;
const FIX_LABELS = {
  wrong: 'text-wrong-label',
  wait: 'text-attention-glyph',
} as const;
const FIX_WORDS = {
  wrong: 'bg-wrong-fg/15 text-wrong-fg',
  wait: 'bg-attention-glyph/15 text-attention-glyph',
} as const;

const Fix: React.FC<{ step: CheckStep }> = ({ step }) => {
  if (step.fix === null) {
    return null;
  }
  const { fix } = step;
  const tone = step.state === 'wait' ? 'wait' : 'wrong';
  return (
    <div className={`flex flex-col gap-3 border-b px-5 pt-1 pb-4 sm:pl-12 ${FIX_TONES[tone]}`}>
      <span
        className={`w-fit rounded-sm px-1.5 py-0.5 font-mono font-semibold text-[11px] uppercase tracking-wider ${FIX_WORDS[tone]}`}
      >
        {claimCopy.steps.state[step.state]}
      </span>
      {fix.record !== null && (
        <div className='flex flex-col gap-0.5'>
          <span className={`font-medium text-xs uppercase tracking-wider ${FIX_LABELS[tone]}`}>
            {fix.record.label}
          </span>
          <ul className='flex flex-col gap-0.5'>
            {fix.record.values.map((value) => (
              <li key={value} className='break-all font-mono text-fg text-sm'>
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className='max-w-2xl font-medium text-fg text-sm leading-relaxed'>{fix.action}</p>
      {fix.copyable !== null && (
        <div className='max-w-md'>
          <CopyField label={fix.copyable.label} value={fix.copyable.value} />
        </div>
      )}
      <p className='max-w-2xl text-fg-2 text-sm leading-relaxed'>{fix.description}</p>
    </div>
  );
};

const Rows: React.FC<{ steps: CheckStep[] }> = ({ steps }) => (
  <>
    {steps.map((step) => (
      <div key={step.key}>
        <div
          className={`grid grid-cols-[1rem_1fr] items-start gap-x-3 gap-y-0.5 border-line border-b px-5 py-2 text-sm sm:grid-cols-[1rem_11rem_1fr] ${
            step.state === 'wrong'
              ? 'bg-wrong-bg border-wrong-line shadow-[inset_3px_0_0_var(--color-wrong-fg)]'
              : step.state === 'wait' && step.fix !== null
                ? 'bg-attention-bg border-attention-line shadow-[inset_3px_0_0_var(--color-attention-glyph)]'
                : ''
          }`}
        >
          <Glyph state={step.state} />
          <span className={step.state === 'idle' ? 'text-fg-4' : 'text-fg'}>
            {claimCopy.steps.label[step.key]}
            {/* The glyph carries the state for a sighted reader. This carries it for the rest. */}
            <span className='sr-only'>, {claimCopy.steps.state[step.state]}</span>
          </span>
          <span
            className={`col-start-2 break-words font-mono text-xs leading-5 sm:col-start-3 ${
              step.state === 'wrong'
                ? 'text-wrong-fg'
                : step.state === 'wait'
                  ? 'text-attention-glyph'
                  : step.state === 'idle'
                    ? 'text-fg-4'
                    : 'text-fg-2'
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
    <div className='flex flex-col gap-2 rounded-lg border border-attention-line bg-attention-bg p-4'>
      <p className='font-medium text-fg text-sm'>{problem.title}</p>
      <p className='max-w-2xl font-medium text-fg text-sm leading-relaxed'>{problem.action}</p>
      <p className='max-w-2xl text-fg-2 text-sm leading-relaxed'>{problem.description}</p>
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
    <section className='overflow-hidden rounded-lg border border-line bg-surface'>
      <div className='flex items-baseline justify-between gap-3 border-line border-b px-5 py-2.5'>
        <h2 className='font-medium text-fg-3 text-xs uppercase tracking-wider'>{copy.heading}</h2>
        <span className='font-mono text-fg-3 text-xs'>{copy.answered(view.answered)}</span>
      </div>
      <Rows steps={view.steps} />
    </section>
  ) : (
    <details className='group rounded-lg border border-line bg-surface'>
      <summary className='flex cursor-pointer list-none items-center gap-3 rounded-lg px-5 py-3 text-fg-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden'>
        <Chevron />
        {copy.summary(copy.summaryThrough)}
      </summary>
      <div className='border-line border-t'>
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
