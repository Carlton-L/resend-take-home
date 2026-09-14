// src/app/claim/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';
import ClaimCheck from '@/components/ClaimCheck/ClaimCheck';
import ClaimCheckPending from '@/components/ClaimCheckPending/ClaimCheckPending';
import ClaimProvider from '@/components/ClaimProvider/ClaimProvider';
import ClaimStatus from '@/components/ClaimStatus/ClaimStatus';
import ClaimStatusChecked from '@/components/ClaimStatusChecked/ClaimStatusChecked';
import Notice from '@/components/Notice/Notice';
import RecordCard from '@/components/RecordCard/RecordCard';
import ReleaseClaim from '@/components/ReleaseClaim/ReleaseClaim';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInUser } from '@/lib/auth/supabase/server';
import { runCheck } from '@/lib/claims/check';
import { claimPath, isClaimId } from '@/lib/claims/config';
import { claimCopy, describeStatus } from '@/lib/claims/messages';
import { formatRecordValue, recordFullName, recordRelativeHost } from '@/lib/claims/record';
import { holdsTheName } from '@/lib/claims/state';
import { claimForOwner, heldByAnother } from '@/lib/claims/store';

/**
 * Never prerendered or cached. The page runs a DNS check and reads a row scoped to the signed in
 * account, so a shared static copy of it would be wrong for everyone but the first visitor.
 */
export const dynamic = 'force-dynamic';

type ClaimRecordPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existing?: string; reissued?: string }>;
};

/**
 * The record screen.
 *
 * The record renders straight away and the check streams in behind it, because the value is what
 * the user came for and the check is the part that can take seconds on a zone with a dead
 * nameserver.
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

  /*
    Started here and deliberately not awaited. Two Suspense boundaries below read this same promise,
    so the trace runs once and the write happens once while both regions stream independently. This
    is the App Router shape for one async result feeding several streamed places: create the promise
    in the parent, hand it down, await it inside each boundary. It only works because both consumers
    are Server Components; a Client Component would need `use`.
  */
  const outcome = runCheck(claim);

  return (
    <main className='mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16 sm:py-24'>
      {/*
        The fallback is the claim as the row has it, which is what the shell can say with no waiting.
        The check replaces it, because a claim that verifies during this render was pending when the
        shell went out and the pill would otherwise contradict the result below it.
      */}
      <Suspense
        fallback={
          <ClaimStatus name={claim.name} message={describeStatus(claim.status, claim.verifiedAt)} />
        }
      >
        <ClaimStatusChecked name={claim.name} outcome={outcome} />
      </Suspense>

      <div className='flex max-w-2xl flex-col gap-6 empty:hidden'>
        {reissued === '1' && <Notice>{claimCopy.record.reissued}</Notice>}
        {existing === '1' && reissued !== '1' && <Notice>{claimCopy.record.existing}</Notice>}
        {contested && <Notice tone='attention'>{claimCopy.record.challenger(claim.name)}</Notice>}
      </div>

      {/*
        The chain is above the record card and stays in one place. Closed it costs one line; open it
        is because something matters more than copying the record. It never appears or disappears,
        because an absence cannot tell "you fixed it" from "we stopped looking".

        The live region is in the document from first render, holding the pending state, and only
        its contents change when the check streams in. A region inserted at the same moment as its
        content is not reliably announced, which would leave a screen reader on "checking" with no
        idea the answer had arrived.

        The record row needs the wider page. Prose does not, so the check keeps the measure the rest
        of the app reads at.
      */}
      <div role='status' aria-live='polite' className='flex max-w-2xl flex-col'>
        <Suspense fallback={<ClaimCheckPending />}>
          <ClaimCheck outcome={outcome} />
        </Suspense>
      </div>

      <RecordCard
        name={claim.name}
        host={host}
        fullName={fullName}
        value={value}
        expiresAt={claim.expiresAt}
        held={holdsTheName(claim.status)}
      />

      {/*
        At the foot, beneath both cards, because it is acted on while looking at the record. Nothing
        renders until the check resolves, so there is no fallback and no reserved space.
      */}
      <Suspense fallback={null}>
        <ClaimProvider outcome={outcome} />
      </Suspense>

      <div className='mt-auto border-neutral-200 border-t pt-6'>
        <ReleaseClaim id={claim.id} name={claim.name} host={fullName} />
      </div>
    </main>
  );
};

export default ClaimRecordPage;
