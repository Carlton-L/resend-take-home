// src/app/claim/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import type React from 'react';
import BackLink from '@/components/BackLink/BackLink';
import CheckRunner from '@/components/CheckRunner/CheckRunner';
import ClaimCheck from '@/components/ClaimCheck/ClaimCheck';
import ClaimProvider from '@/components/ClaimProvider/ClaimProvider';
import ClaimStatusLive from '@/components/ClaimStatusLive/ClaimStatusLive';
import Notice from '@/components/Notice/Notice';
import RecordCard from '@/components/RecordCard/RecordCard';
import ReleaseClaim from '@/components/ReleaseClaim/ReleaseClaim';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInUser } from '@/lib/auth/supabase/server';
import { claimPath, isClaimId } from '@/lib/claims/config';
import { claimCopy, describeStatus } from '@/lib/claims/messages';
import { formatRecordValue, recordFullName, recordRelativeHost } from '@/lib/claims/record';
import { holdsTheName } from '@/lib/claims/state';
import { claimForOwner, heldByAnother } from '@/lib/claims/store';

/**
 * Never prerendered or cached. The page reads a row scoped to the signed in account, so a shared
 * static copy of it would be wrong for everyone but the first visitor.
 */
export const dynamic = 'force-dynamic';

type ClaimRecordPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existing?: string; reissued?: string }>;
};

/**
 * The record screen.
 *
 * The record is rendered from the row and the check runs from the browser. It used to run here, in
 * the page body, which meant it could not be rate limited, a prefetched row spent a DNS trace on a
 * cursor passing over it, and the only way to ask again was the browser's reload button. All three
 * are the same cause, so all three are fixed by the check being a request of its own.
 *
 * A claim belonging to another account is not found rather than forbidden. Telling a stranger that
 * an id exists and is someone else's is an answer they have no use for.
 */
const ClaimRecordPage: React.FC<ClaimRecordPageProps> = async ({ params, searchParams }) => {
  const user = await signedInUser();
  const { id } = await params;

  // Back to this claim rather than to the list. The id is not checked first on purpose: a signed
  // out visitor with a malformed URL signs in and then gets the same 404 they would have had.
  if (user === null) {
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(claimPath(id))}`);
  }

  if (!isClaimId(id)) {
    notFound();
  }

  const claim = await claimForOwner(id, user.id);
  if (claim === null) {
    notFound();
  }

  const { existing, reissued } = await searchParams;
  const contested = await heldByAnother(claim.name, user.id);

  const host = recordRelativeHost(claim.name, claim.registrableDomain);
  const fullName = recordFullName(claim.name);
  const value = formatRecordValue(claim.token, claim.expiresAt);

  return (
    <main
      id='main'
      className='mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16 sm:py-24'
    >
      {/*
        A Client Component wrapping Server Components. Everything below is rendered on the server
        and handed to the runner as `children`, already built, so the check's state reaches three
        places without any of this markup going into the browser bundle.
      */}
      <BackLink />
      <CheckRunner claimId={claim.id}>
        {/*
          The status starts as the claim's own row, which is what the page can say with no waiting,
          and the check replaces it. The two are separate on purpose: a claim that verifies during
          the first check was pending when the markup went out.
        */}
        <ClaimStatusLive
          name={claim.name}
          initial={describeStatus(claim.status, claim.verifiedAt)}
        />

        <div className='flex flex-col gap-6 empty:hidden'>
          {reissued === '1' && <Notice>{claimCopy.record.reissued}</Notice>}
          {existing === '1' && reissued !== '1' && <Notice>{claimCopy.record.existing}</Notice>}
          {contested && <Notice tone='attention'>{claimCopy.record.challenger(claim.name)}</Notice>}
        </div>

        {/*
          The chain is above the record card and stays in one place. Closed it costs one line; open
          it is because something matters more than copying the record. It never goes away once it
          has said anything, because an absence cannot tell "you fixed it" from "we stopped
          looking".

          The live region is in the document from first render, holding the pending state, and only
          its contents change when a check answers. A region inserted at the same moment as its
          content is not reliably announced, which would leave a screen reader on "checking" with
          no idea the answer had arrived.

          A check on the cadence that finds the same thing as the last one renders the same strings,
          so React changes no DOM and nothing is announced. Only an answer that actually changed is
          read out, which is the behaviour this region wants and the reason not to rebuild it out of
          keys or timestamps.

          The chain and the record card share one width. Prose inside the chain is capped on the
          paragraph, so a line stays readable while the two cards line up.
        */}
        <div role='status' aria-live='polite' className='flex flex-col'>
          <ClaimCheck />
        </div>

        <RecordCard
          name={claim.name}
          host={host}
          fullName={fullName}
          value={value}
          expiresAt={claim.expiresAt}
          held={holdsTheName(claim.status)}
        />

        {/* At the foot, beneath both cards, because it is acted on while looking at the record. */}
        <ClaimProvider />

        <div className='mt-auto border-line border-t pt-6'>
          <ReleaseClaim id={claim.id} name={claim.name} host={fullName} />
        </div>
      </CheckRunner>
    </main>
  );
};

export default ClaimRecordPage;
