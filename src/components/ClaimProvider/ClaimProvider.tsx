// src/components/ClaimProvider/ClaimProvider.tsx
import type React from 'react';
import type { ClaimOutcome } from '@/lib/claims/check';
import { claimCopy } from '@/lib/claims/messages';
import { describeProvider } from '@/lib/claims/provider';

type ClaimProviderProps = {
  outcome: Promise<ClaimOutcome>;
};

/**
 * Which company answers for this domain, at the foot of the page.
 *
 * Kept out of the status line and out of the chain, because it is the fact a person acts on while
 * looking at the record above it: this record goes in that panel. It is also the only part of the
 * page that cannot exist unless the first two steps passed, so it quietly confirms them even when
 * the chain is closed.
 */
const ClaimProvider: React.FC<ClaimProviderProps> = async ({ outcome }) => {
  const { trace } = await outcome;
  const provider = trace === null ? null : describeProvider(trace.nameservers);
  if (provider === null) {
    return null;
  }

  return (
    <p className='max-w-2xl text-neutral-600 text-sm leading-relaxed'>
      {provider.recognized
        ? claimCopy.record.provider.recognized(provider.name)
        : claimCopy.record.provider.unrecognized(provider.name)}
    </p>
  );
};

export default ClaimProvider;
