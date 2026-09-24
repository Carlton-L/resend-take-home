// src/app/auth/layout.tsx
import type React from 'react';
import LegacyFrame from '@/components/LegacyFrame/LegacyFrame';

type Props = {
  children: React.ReactNode;
};

/** Signed out pages keep the old header until sign in is rebuilt. */
const Layout: React.FC<Props> = ({ children }) => (
  <LegacyFrame email={null}>{children}</LegacyFrame>
);

export default Layout;
