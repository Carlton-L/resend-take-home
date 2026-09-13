// src/app/layout.tsx
import type { Metadata } from 'next';
import type React from 'react';
import AppHeader from '@/components/AppHeader/AppHeader';
import { signedInEmail } from '@/lib/auth/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'DomainClaim',
  description:
    'Claim a domain, prove you control it, and see exactly what is happening at each step.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

/**
 * Reading the session here makes every page dynamic, which they already are: a page whose header
 * names the signed in account cannot be served from a static file.
 */
const RootLayout: React.FC<RootLayoutProps> = async ({ children }) => {
  const email = await signedInEmail();

  return (
    <html lang='en'>
      <body className='flex min-h-dvh flex-col bg-white text-neutral-900 antialiased'>
        <AppHeader email={email} />
        <div className='flex flex-1 flex-col'>{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;
