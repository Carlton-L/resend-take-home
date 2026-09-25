// src/app/page.tsx
import type { Metadata } from 'next';
import type React from 'react';
import { Suspense } from 'react';
import SignedOutFrame from '@/components/SignedOutFrame/SignedOutFrame';
import { signInCopy } from '@/lib/auth/messages';
import SignInScreen from '@/screens/SignInScreen/SignInScreen';

export const metadata: Metadata = {
  title: 'DomainClaim',
  description:
    'Claim a domain, prove you control it, and see exactly what is happening at each step.',
};

/**
 * The front page is sign in. Static: a signed in visitor never gets here, since the proxy sends
 * them on, and `next` is read and checked on the client with the same function the server uses.
 */
const HomePage: React.FC = () => (
  <SignedOutFrame crumb={signInCopy.form.heading}>
    <Suspense fallback={null}>
      <SignInScreen />
    </Suspense>
  </SignedOutFrame>
);

export default HomePage;
