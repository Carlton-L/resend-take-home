// src/components/ClaimCheckPending/ClaimCheckPending.tsx
import type React from 'react';
import { claimCopy } from '@/lib/claims/messages';

/**
 * What the chain shows before the first check has answered.
 *
 * `ClaimCheck` renders this while `CheckRunner` has no view yet, which is the moment between the
 * page arriving and the endpoint answering. It is server rendered as part of the page, so a person
 * sees it with the record rather than after a script has loaded.
 *
 * The live region is on the page, around the whole chain, rather than here. A region that arrives
 * and leaves with its own content is not reliably announced.
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
