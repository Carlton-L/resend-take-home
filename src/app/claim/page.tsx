// src/app/claim/page.tsx
import { redirect } from 'next/navigation';
import type React from 'react';
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
    <main className='mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'>
      <div className='flex flex-col gap-2'>
        <h1 className='font-medium text-2xl tracking-tight'>Claim a domain</h1>
        <p className='text-neutral-600 leading-relaxed'>
          Enter the domain you want to prove you control. Anything that has to change to make it a
          DNS name is listed back to you.
        </p>
      </div>

      {failure !== null && (
        <FailureNotice tone='attention' message={{ ...failure, record: null, copyable: null }} />
      )}

      <DomainInputForm allowTestNamespace={demo} />

      {demo && (
        <details className='rounded-md border border-neutral-200 bg-neutral-50 p-4'>
          <summary className='cursor-pointer font-medium text-neutral-900 text-sm'>
            {claimCopy.demo.heading}
          </summary>
          <p className='pt-2 text-neutral-600 text-sm leading-relaxed'>
            {claimCopy.demo.description}
          </p>
          <ul className='flex flex-col gap-1 pt-3'>
            {testNames().map((name) => (
              <li key={name} className='font-mono text-neutral-700 text-sm'>
                {name}
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
};

export default ClaimPage;
