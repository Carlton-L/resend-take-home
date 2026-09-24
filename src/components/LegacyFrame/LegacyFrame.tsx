// src/components/LegacyFrame/LegacyFrame.tsx
import type React from 'react';
import AppHeader from '@/components/AppHeader/AppHeader';

type LegacyFrameProps = {
  email: string | null;
  children: React.ReactNode;
};

/**
 * The header and column the root layout used to give every page. Only the pages that have not
 * moved into the new app shell use it, and it goes away with them.
 */
const LegacyFrame: React.FC<LegacyFrameProps> = ({ email, children }) => (
  <>
    <AppHeader email={email} />
    <div className='flex flex-1 flex-col'>{children}</div>
  </>
);

export default LegacyFrame;
