// src/app/claim/page.tsx
import { redirect } from 'next/navigation';
import type React from 'react';
import BackLink from '@/components/BackLink/BackLink';
import CopyButton from '@/components/CopyButton/CopyButton';
import DomainInputForm from '@/components/DomainInputForm/DomainInputForm';
import FailureNotice from '@/components/FailureNotice/FailureNotice';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInEmail } from '@/lib/auth/supabase/server';
import { CLAIM_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';
import { testNames, testNamespaceEnabled } from '@/lib/dns/testNames';

/**
 * Server component. It ships no JavaScript of its own, and the interactive part is the one child
 * that needs it.
 *
 * The session is checked here as well as in the proxy. A matcher is a pattern; this page is the
 * thing that knows it needs an account, so it is the thing that says so.
 */
type ClaimPageProps = {
  searchParams: Promise<{ error?: string }>;
};

/** What the claim endpoint can send back. Anything else is ignored rather than rendered. */
/** The demo list's outcome word, in the tone the chain would show it. */
const OUTCOME_TONES = {
  good: 'text-good-fg',
  neutral: 'text-fg',
  attention: 'text-attention-glyph',
} as const;

const DEMO_HEAD = 'px-3 pb-2 font-medium text-fg-3 text-xs uppercase tracking-wider';

const CREATE_ERRORS = {
  limited: claimCopy.create.tooMany,
  unavailable: claimCopy.create.unavailable,
  invalid: claimCopy.create.invalid,
} as const;

const ClaimPage: React.FC<ClaimPageProps> = async ({ searchParams }) => {
  if ((await signedInEmail()) === null) {
    // Back to this screen rather than to wherever sign in lands by default, which is the list.
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(CLAIM_PATH)}`);
  }

  const { error } = await searchParams;
  const failure =
    error !== undefined && error in CREATE_ERRORS
      ? CREATE_ERRORS[error as keyof typeof CREATE_ERRORS]
      : null;

  const demo = testNamespaceEnabled();

  return (
    <main
      id='main'
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'
    >
      <BackLink />
      <div className='flex flex-col gap-2'>
        <h1 className='font-medium text-2xl tracking-tight'>Claim a domain</h1>
        <p className='text-fg-2 leading-relaxed'>
          Enter a domain. The exact name that will be claimed is shown before anything is saved.
        </p>
      </div>

      {failure !== null && (
        <FailureNotice tone='attention' message={{ ...failure, record: null, copyable: null }} />
      )}

      <DomainInputForm allowTestNamespace={demo} />

      {demo && (
        <details className='rounded-lg border border-line bg-surface-2 p-4'>
          <summary className='cursor-pointer rounded-sm font-medium text-fg text-sm focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'>
            {claimCopy.demo.heading}
          </summary>
          <p className='pt-2 text-fg-2 text-sm leading-relaxed'>{claimCopy.demo.description}</p>
          {/*
            A table, because three things are said about every name and a reader compares down a
            column. The copy control sits before the name so there is no question what it copies.
            A tooltip has no touch equivalent, so the outcome is a column, and its label uses the
            words the chain uses.
          */}
          <div className='overflow-x-auto pt-3'>
            <table className='w-full min-w-[32rem] border-collapse text-sm'>
              <thead>
                <tr className='border-line border-b text-left'>
                  <th scope='col' className={`${DEMO_HEAD} pl-0`}>
                    {claimCopy.demo.columns.name}
                  </th>
                  <th scope='col' className={DEMO_HEAD}>
                    {claimCopy.demo.columns.outcome}
                  </th>
                  <th scope='col' className={DEMO_HEAD}>
                    {claimCopy.demo.columns.script}
                  </th>
                </tr>
              </thead>
              <tbody>
                {testNames().map((name) => {
                  const outcome = claimCopy.demo.outcome[name];
                  return (
                    <tr key={name} className='border-line border-b last:border-b-0'>
                      <td className='py-1.5 pr-3 align-middle'>
                        <span className='flex items-center gap-2'>
                          <CopyButton
                            value={name}
                            className='flex size-7 shrink-0 items-center justify-center rounded-sm border border-line-2 bg-surface text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1'
                          />
                          <span className='whitespace-nowrap font-mono text-fg'>{name}</span>
                        </span>
                      </td>
                      {outcome !== undefined && (
                        <>
                          <td
                            className={`whitespace-nowrap px-3 py-1.5 align-middle font-medium ${OUTCOME_TONES[outcome.tone]}`}
                          >
                            {outcome.label}
                          </td>
                          <td className='px-3 py-1.5 align-middle text-fg-2'>{outcome.line}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </main>
  );
};

export default ClaimPage;
