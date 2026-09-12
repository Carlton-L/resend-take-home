// src/app/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'DomainClaim',
  description:
    'Claim a domain, prove you control it, and see exactly what is happening at each step.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang='en'>
      <body className='min-h-dvh bg-white text-neutral-900 antialiased'>{children}</body>
    </html>
  );
};

export default RootLayout;
