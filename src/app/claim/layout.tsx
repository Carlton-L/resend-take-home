// src/app/claim/layout.tsx
import type React from 'react';
import LegacyFrame from '@/components/LegacyFrame/LegacyFrame';
import { signedInEmail } from '@/lib/auth/supabase/server';

type ClaimLayoutProps = {
  children: React.ReactNode;
};

/** The old claim screen keeps its header until it moves into the app shell. */
const ClaimLayout: React.FC<ClaimLayoutProps> = async ({ children }) => (
  <LegacyFrame email={await signedInEmail()}>{children}</LegacyFrame>
);

export default ClaimLayout;
