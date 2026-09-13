// src/app/signin/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type React from 'react';
import SignInForm from '@/components/SignInForm/SignInForm';
import { DEFAULT_SIGNED_IN_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { safeNextPath } from '@/lib/auth/nextPath';
import { signedInEmail } from '@/lib/auth/supabase/server';

export const metadata: Metadata = {
  title: 'Sign in',
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Server Component. `next` is checked here, before it reaches the client, so the value the form
 * posts back has already been through the same function the link builder uses.
 */
const SignInPage: React.FC<SignInPageProps> = async ({ searchParams }) => {
  const params = await searchParams;
  const raw = typeof params.next === 'string' ? params.next : null;
  const next = safeNextPath(raw);

  if ((await signedInEmail()) !== null) {
    redirect(next ?? DEFAULT_SIGNED_IN_PATH);
  }

  return (
    <main className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16'>
      <h1 className='font-medium text-2xl tracking-tight'>{signInCopy.form.heading}</h1>
      <SignInForm next={next} />
    </main>
  );
};

export default SignInPage;
