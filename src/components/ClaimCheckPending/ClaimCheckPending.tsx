// src/components/ClaimCheckPending/ClaimCheckPending.tsx
import type React from 'react';
import { claimCopy } from '@/lib/claims/messages';

/**
 * What the page shows while the check is still running.
 *
 * This is the `fallback` of the Suspense boundary around the check, so it is sent with the rest of
 * the page and replaced when the real result arrives down the same response. No client state and
 * no second request.
 *
 * The live region is on the page, around the boundary, rather than here. A region that arrives and
 * leaves with its own content is not reliably announced.
 */
const ClaimCheckPending: React.FC = () => {
  return (
    <div className='flex items-center gap-3 rounded-lg border border-line bg-surface p-5 text-fg-2 text-sm'>
      <span
        aria-hidden='true'
        className='size-2 animate-pulse rounded-full bg-fg-4 motion-reduce:animate-none'
      />
      {claimCopy.check.running}
    </div>
  );
};

export default ClaimCheckPending;
