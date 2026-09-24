// src/app/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';
import LegacyFrame from '@/components/LegacyFrame/LegacyFrame';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInEmail } from '@/lib/auth/supabase/server';

/**
 * The signed out landing, and only that.
 *
 * An account that is already signed in is sent to where sign in lands, because this page argues
 * for the product to someone deciding whether to use it. Someone who has claims has decided.
 */
const HomePage: React.FC = async () => {
  if ((await signedInEmail()) !== null) {
    redirect(DEFAULT_SIGNED_IN_PATH);
  }

  return (
    <LegacyFrame email={null}>
      <main
        id='main'
        className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'
      >
        <h1 className='font-medium text-2xl tracking-tight'>DomainClaim</h1>
        <p className='text-fg-2 leading-relaxed'>
          Claim a domain, prove you control it, and see exactly what is happening at each step,
          including when verification fails and what to do about it.
        </p>
        <Link
          href={SIGN_IN_PATH}
          className='w-fit rounded-md bg-primary px-4 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
        >
          Sign in to claim a domain
        </Link>
      </main>
    </LegacyFrame>
  );
};

export default HomePage;
