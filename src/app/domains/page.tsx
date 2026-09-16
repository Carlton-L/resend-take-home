// src/app/domains/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';
import DomainList from '@/components/DomainList/DomainList';
import RefreshList from '@/components/RefreshList/RefreshList';
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
  'w-fit rounded-md bg-primary px-3 py-1.5 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';

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
    <main
      id='main'
      className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24'
    >
      {/*
        The claim control sits beside the heading, since this list is where claims live and the
        header no longer carries one. The empty state keeps its own, the only control on that
        screen, and this one is hidden there so the two never share a viewport.
      */}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex flex-col gap-2'>
          <h1 className='font-medium text-2xl tracking-tight'>{copy.heading}</h1>
          <p className='text-fg-2 leading-relaxed'>{copy.intro}</p>
        </div>
        {claims.length > 0 && (
          <div className='flex flex-col gap-1.5 sm:items-end'>
            <div className='flex flex-wrap items-center gap-2'>
              <Link href={CLAIM_PATH} className={ACTION_CLASS}>
                {copy.claim}
              </Link>
              <RefreshList />
            </div>
            {/*
              What Refresh does, said where it is pressed. After a DNS change the list stays where
              the last check left it, and without this line the control reads as doing nothing.
            */}
            <p className='text-fg-3 text-xs'>{copy.refreshNote}</p>
          </div>
        )}
      </div>

      {claims.length === 0 ? (
        <div className='overflow-hidden rounded-lg border border-line bg-surface'>
          <div className='flex flex-col items-start gap-3 p-8'>
            <h2 className='font-medium text-fg'>{copy.empty.title}</h2>
            <p className='text-fg-2 text-sm leading-relaxed'>{copy.empty.description}</p>
            <Link href={CLAIM_PATH} className={`${ACTION_CLASS} mt-1`}>
              {copy.claim}
            </Link>
          </div>
        </div>
      ) : (
        <DomainList claims={claims} />
      )}
    </main>
  );
};

export default DomainsPage;
