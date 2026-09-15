// src/components/DomainResultEmpty/DomainResultEmpty.tsx
import type React from 'react';
import { claimCopy } from '@/lib/claims/messages';

/**
 * The result card before there is a result.
 *
 * It holds the space the real card will take, so the page does not jump when the first valid name
 * lands, and it says what is about to happen: the name gets read back before anything is claimed.
 * That is the argument this whole screen makes, and stating it before the first keystroke is better
 * than stating it after.
 *
 * The disabled control is deliberate rather than decorative. A button that is visibly present and
 * visibly not ready reads as a step that is coming, where an empty area reads as nothing at all.
 */
const DomainResultEmpty: React.FC = () => {
  return (
    <div className='flex flex-col gap-5 rounded-lg border border-line border-dashed bg-surface p-5'>
      <div className='flex flex-col gap-1'>
        <span className='font-medium text-fg-4 text-xs uppercase tracking-wider'>
          {claimCopy.create.nameToClaim}
        </span>
        <span className='font-mono text-lg text-fg-4'>{claimCopy.create.awaitingName}</span>
      </div>

      <button
        type='button'
        disabled
        className='self-start cursor-not-allowed rounded-md bg-line px-4 py-2 font-medium font-mono text-fg-4 text-sm'
      >
        {claimCopy.create.submitEmpty}
      </button>

      <p className='border-line border-t pt-4 text-fg-3 text-sm leading-relaxed'>
        {claimCopy.create.empty}
      </p>
    </div>
  );
};

export default DomainResultEmpty;
