// src/app/domains/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';
import ClaimRow from '@/components/ClaimRow/ClaimRow';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInUser } from '@/lib/auth/supabase/server';
import { CLAIM_PATH, DOMAINS_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';
import { claimsForOwner } from '@/lib/claims/store';

/**
 * Never prerendered or cached. Every row is scoped to the signed in account, so a shared static
 * copy of this page would be one account's claims shown to everyone.
 */
export const dynamic = 'force-dynamic';

/** Only the empty state uses it. Every other screen reaches the claim form from the header. */
const ACTION_CLASS =
  'w-fit rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2';

/**
 * The domain list.
 *
 * No check runs here. Every row's state is the claim's own, read from the database, so opening the
 * list costs one query no matter how many names are in it. The record screen is where a claim is
 * checked, because that is where someone has gone to do something about the answer.
 *
 * The session is checked here as well as in the proxy. A matcher is a pattern; this page is the
 * thing that knows it needs an account, so it is the thing that says so.
 */
const DomainsPage: React.FC = async () => {
  const user = await signedInUser();
  if (user === null) {
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(DOMAINS_PATH)}`);
  }

  const claims = await claimsForOwner(user.id);
  const copy = claimCopy.list;

  return (
    <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'>
      {/*
        No claim control beside the heading. The header carries one on every screen, so a second
        copy of it here would be two controls saying the same thing in one viewport. The empty
        state below is the exception, because that is the first screen an account sees and the
        sentence explaining what will appear here is the place to act on.
      */}
      <div className='flex flex-col gap-2'>
        <h1 className='font-medium text-2xl tracking-tight'>{copy.heading}</h1>
        <p className='text-neutral-600 leading-relaxed'>{copy.intro}</p>
      </div>

      <div className='rounded-md border border-neutral-200'>
        {claims.length === 0 ? (
          <div className='flex flex-col items-start gap-3 p-8'>
            <h2 className='font-medium text-neutral-900'>{copy.empty.title}</h2>
            <p className='text-neutral-600 text-sm leading-relaxed'>{copy.empty.description}</p>
            <Link href={CLAIM_PATH} className={`${ACTION_CLASS} mt-1`}>
              {copy.claim}
            </Link>
          </div>
        ) : (
          <ul className='divide-y divide-neutral-200'>
            {claims.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default DomainsPage;
