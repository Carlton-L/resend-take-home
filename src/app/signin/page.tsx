// src/app/signin/page.tsx
import type { Metadata } from 'next';
import type React from 'react';
import { Suspense } from 'react';
import SignInScreen from '@/screens/SignInScreen/SignInScreen';

export const metadata: Metadata = {
  title: 'Sign in',
};

/**
 * Static. A signed in visitor never gets here, since the proxy sends them on, and `next` is read
 * and checked on the client with the same function the server uses.
 */
const SignInPage: React.FC = () => (
  <Suspense fallback={null}>
    <SignInScreen />
  </Suspense>
);

export default SignInPage;
