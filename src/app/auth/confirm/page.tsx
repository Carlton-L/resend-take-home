// src/app/auth/confirm/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type React from 'react';
import AutoSubmit from '@/components/AutoSubmit/AutoSubmit';
import Operator from '@/components/Operator/Operator';
import { DEFAULT_SIGNED_IN_PATH, LINK_DEAD_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { safeNextPath } from '@/lib/auth/nextPath';
import { confirmLinkSignatureValid } from '@/lib/auth/secrets';
import { signedInEmail } from '@/lib/auth/supabase/server';
import { BUTTON } from '@/screens/ClaimScreen/buttons';

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
 * Rendered on GET, redeemed on POST. The page spends nothing itself. In a browser a script posts
 * the form as it loads, so the email link signs in with one click, and the page shows a spinner
 * for the moment that takes. A scanner that fetches the link
 * without running scripts sees this page and stops, so the token survives for the person. With
 * scripts off, the button does the same thing.
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

  const copy = signInCopy.confirm;
  return (
    <div className='page-wrap flex flex-1 items-center justify-center py-12'>
      <Operator
        label={copy.label}
        badge={copy.badge}
        badgeTone='wait'
        className='w-[min(460px,100%)]'
      >
        <div className='px-[26px] pt-[26px] pb-[22px] max-[720px]:px-5'>
          <div className='flex items-center gap-3'>
            <span
              aria-hidden='true'
              className='size-5 flex-none animate-spin rounded-full border-2 border-line-control border-t-signal motion-reduce:animate-none'
            />
            <h1 className='font-semibold text-2xl tracking-[-0.02em]'>{copy.title}</h1>
          </div>
          <p role='status' className='mt-2 text-fg-3'>
            {copy.description(email)}
          </p>
          <form id='confirm-sign-in' method='post' action='/api/auth/confirm'>
            <input type='hidden' name='token_hash' value={tokenHash} />
            <input type='hidden' name='email' value={email} />
            <input type='hidden' name='sig' value={signature} />
            {next !== null && <input type='hidden' name='next' value={next} />}
            <noscript>
              <p className='mt-4 mb-3 text-[13px] text-fg-3'>{copy.note}</p>
              <button type='submit' className={BUTTON.primary}>
                {copy.submit}
              </button>
            </noscript>
          </form>
          <AutoSubmit formId='confirm-sign-in' />
        </div>
      </Operator>
    </div>
  );
};

export default ConfirmPage;
