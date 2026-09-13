// src/app/claim/page.tsx
import { redirect } from 'next/navigation';
import type React from 'react';
import DomainInputForm from '@/components/DomainInputForm/DomainInputForm';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInEmail } from '@/lib/auth/supabase/server';

/**
 * Server component. It ships no JavaScript of its own, and the interactive part is the one child
 * that needs it. When this page loads existing claims from the database it can await that query
 * here and pass the rows down as props.
 *
 * The session is checked here as well as in the proxy. A matcher is a pattern; this page is the
 * thing that knows it needs an account, so it is the thing that says so.
 */
const ClaimPage: React.FC = async () => {
  if ((await signedInEmail()) === null) {
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(DEFAULT_SIGNED_IN_PATH)}`);
  }

  return (
    <main className='mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'>
      <div className='flex flex-col gap-2'>
        <h1 className='font-medium text-2xl tracking-tight'>Claim a domain</h1>
        <p className='text-neutral-600 leading-relaxed'>
          Enter the domain you want to prove you control. Anything that has to change to make it a
          DNS name is listed back to you.
        </p>
      </div>

      <DomainInputForm />

      <p className='mt-auto border-neutral-200 border-t pt-4 text-neutral-500 text-sm'>
        This screen stops at the name. Claims are not saved yet.
      </p>
    </main>
  );
};

export default ClaimPage;
