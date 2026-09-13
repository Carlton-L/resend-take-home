// src/app/claim/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import type React from 'react';
import { Suspense } from 'react';
import ClaimCheck from '@/components/ClaimCheck/ClaimCheck';
import ClaimCheckPending from '@/components/ClaimCheckPending/ClaimCheckPending';
import Notice from '@/components/Notice/Notice';
import RecordCard from '@/components/RecordCard/RecordCard';
import ReleaseClaim from '@/components/ReleaseClaim/ReleaseClaim';
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { signedInUser } from '@/lib/auth/supabase/server';
import { isClaimId } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';
import { formatRecordValue, recordFullName, recordRelativeHost } from '@/lib/claims/record';
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
  if (user === null) {
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(DEFAULT_SIGNED_IN_PATH)}`);
  }

  const { id } = await params;
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
    <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16 sm:py-24'>
      <div className='flex flex-col gap-2'>
        <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
          Claiming
        </span>
        <h1 className='break-all font-medium font-mono text-2xl tracking-tight'>{claim.name}</h1>
      </div>

      {reissued === '1' && <Notice>{claimCopy.record.reissued}</Notice>}
      {existing === '1' && reissued !== '1' && <Notice>{claimCopy.record.existing}</Notice>}
      {contested && <Notice tone='attention'>{claimCopy.record.challenger(claim.name)}</Notice>}

      <RecordCard
        name={claim.name}
        host={host}
        fullName={fullName}
        value={value}
        expiresAt={claim.expiresAt}
      />

      {/*
        The live region is in the document from first render, holding the pending state, and only
        its contents change when the check streams in. A region inserted at the same moment as its
        content is not reliably announced, which would leave a screen reader on "checking" with no
        idea the answer had arrived.
      */}
      <div role='status' aria-live='polite' className='flex flex-col'>
        <Suspense fallback={<ClaimCheckPending />}>
          <ClaimCheck claim={claim} />
        </Suspense>
      </div>

      <div className='mt-auto border-neutral-200 border-t pt-6'>
        <ReleaseClaim id={claim.id} name={claim.name} host={fullName} />
      </div>
    </main>
  );
};

export default ClaimRecordPage;
