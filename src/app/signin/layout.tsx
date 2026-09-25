// src/app/signin/layout.tsx
import type React from 'react';
import SignedOutFrame from '@/components/SignedOutFrame/SignedOutFrame';
import { signInCopy } from '@/lib/auth/messages';

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }) => (
  <SignedOutFrame crumb={signInCopy.form.heading}>{children}</SignedOutFrame>
);

export default Layout;
