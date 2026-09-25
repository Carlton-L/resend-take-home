// src/app/auth/layout.tsx
import type React from 'react';
import SignedOutFrame from '@/components/SignedOutFrame/SignedOutFrame';
import { signInCopy } from '@/lib/auth/messages';

type Props = {
  children: React.ReactNode;
};

/** The pages an email link opens: the confirm page and the dead link page. */
const Layout: React.FC<Props> = ({ children }) => (
  <SignedOutFrame crumb={signInCopy.form.heading}>{children}</SignedOutFrame>
);

export default Layout;
