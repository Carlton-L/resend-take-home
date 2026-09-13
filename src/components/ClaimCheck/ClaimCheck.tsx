// src/components/ClaimCheck/ClaimCheck.tsx
import type React from 'react';
import FailureNotice from '@/components/FailureNotice/FailureNotice';
import Notice from '@/components/Notice/Notice';
import { checkClaim } from '@/lib/claims/check';
import { claimCopy, describeFailure, formatWhen } from '@/lib/claims/messages';
import { describeProvider } from '@/lib/claims/provider';
import { holdsTheName } from '@/lib/claims/state';
import { type Claim, markVerified } from '@/lib/claims/store';

type ClaimCheckProps = {
  claim: Claim;
};

/**
 * The check, run on arrival.
 *
 * An async Server Component inside a Suspense boundary, so the page body is sent immediately and
 * this markup is pushed down the same response when the trace resolves. There is no endpoint and
 * no client JavaScript involved in producing it.
 *
 * It resolves once, which is why the automatic re-checks and their backoff need a different
 * mechanism and arrive with the timeline.
 *
 * The write here is an observation rather than an action the user asked for: conditional on the
 * row still being pending, scoped to its owner, and therefore idempotent under a reload.
 */
const ClaimCheck: React.FC<ClaimCheckProps> = async ({ claim }) => {
  const now = new Date();
  const { trace, result } = await checkClaim(claim, now);
  const provider = trace === null ? null : describeProvider(trace.nameservers);
  const held = holdsTheName(claim.status);

  const provedButHeld =
    result.status === 'verified' && claim.status === 'pending'
      ? (await markVerified(claim.id, claim.ownerId, now)) === 'held_by_another'
      : false;

  return (
    <section className='flex flex-col gap-4'>
      {provider !== null && (
        <p className='text-neutral-600 text-sm leading-relaxed'>
          {provider.recognized
            ? claimCopy.record.provider.recognized(provider.name)
            : claimCopy.record.provider.unrecognized(provider.name)}
        </p>
      )}

      {provedButHeld && (
        <FailureNotice
          tone='attention'
          message={{ ...claimCopy.check.provedButHeld, record: null }}
        />
      )}

      {!provedButHeld && result.status === 'verified' && (
        <div className='flex flex-col gap-3 rounded-md border border-green-300 bg-green-50 p-5'>
          <h3 className='font-medium text-neutral-900'>{claimCopy.check.verifiedTitle}</h3>
          <p className='text-neutral-700 text-sm leading-relaxed'>
            {claimCopy.check.verifiedDescription(
              result.answeredBy,
              formatWhen(claim.verifiedAt ?? now),
            )}
          </p>
          <p className='text-neutral-700 text-sm leading-relaxed'>{claimCopy.check.keepRecord}</p>
        </div>
      )}

      {/*
        A claim that already holds its name and then fails a check is not the same screen as a
        claim that has never been proved. Without this the product tells someone to add a record
        they added weeks ago, while the database still has the name as theirs.
      */}
      {result.status === 'failed' && held && (
        <Notice tone='attention'>
          <span className='font-medium'>{claimCopy.check.stillHeld.title}</span>{' '}
          {claimCopy.check.stillHeld.description(claim.name)} {claimCopy.check.stillHeld.action}
        </Notice>
      )}

      {result.status === 'failed' && (
        <FailureNotice
          tone={held || result.reason.code === 'record_not_found' ? 'neutral' : 'attention'}
          message={describeFailure(result.reason)}
        />
      )}
    </section>
  );
};

export default ClaimCheck;
