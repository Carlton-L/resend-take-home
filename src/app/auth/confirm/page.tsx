// src/app/auth/confirm/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type React from 'react';
import { DEFAULT_SIGNED_IN_PATH, LINK_DEAD_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { safeNextPath } from '@/lib/auth/nextPath';
import { confirmLinkSignatureValid } from '@/lib/auth/secrets';
import { signedInEmail } from '@/lib/auth/supabase/server';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const single = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : null;

/**
 * Rendered on GET, redeemed on POST. This page spends nothing: it shows which account is about to
 * be signed in to and gives one button. A scanner that fetches the link sees this and stops, so
 * the token survives until a person clicks.
 *
 * The address shown here comes out of the link, so it is signed. Without that signature anyone
 * could send someone a link holding their own valid token alongside a display of the recipient's
 * address, and the recipient would sign in to the sender's account believing it was their own.
 * A bad signature is treated as a dead link rather than explained, because there is nothing a real
 * user could do about it.
 */
const ConfirmPage: React.FC<ConfirmPageProps> = async ({ searchParams }) => {
  const params = await searchParams;
  const tokenHash = single(params.token_hash);
  const email = single(params.email);
  const signature = single(params.sig);
  const next = safeNextPath(single(params.next));

  if (tokenHash === null || email === null || signature === null) {
    redirect(LINK_DEAD_PATH);
  }

  if (!confirmLinkSignatureValid({ tokenHash, email, next }, signature)) {
    redirect(LINK_DEAD_PATH);
  }

  // Already signed in as the address this link is for. There is nothing left to prove, so the
  // button would be a step that changes nothing, and a spent token would turn it into an error
  // about a state the person is already in.
  if ((await signedInEmail())?.toLowerCase() === email.toLowerCase()) {
    redirect(next ?? DEFAULT_SIGNED_IN_PATH);
  }

  return (
    <main className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16'>
      <h1 className='font-medium text-2xl tracking-tight'>{signInCopy.confirm.title}</h1>
      <p className='text-neutral-600 leading-relaxed'>{signInCopy.confirm.description(email)}</p>
      <form method='post' action='/api/auth/confirm' className='flex flex-col gap-3'>
        <input type='hidden' name='token_hash' value={tokenHash} />
        <input type='hidden' name='email' value={email} />
        <input type='hidden' name='sig' value={signature} />
        {next !== null && <input type='hidden' name='next' value={next} />}
        <button
          type='submit'
          className='w-fit rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
        >
          {signInCopy.confirm.submit}
        </button>
      </form>
      <p className='text-neutral-500 text-sm'>{signInCopy.confirm.note}</p>
    </main>
  );
};

export default ConfirmPage;
