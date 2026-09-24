// src/app/layout.tsx
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import type React from 'react';
import { appCopy } from '@/lib/copy/app';
import './globals.css';

/*
  Two faces, both as variables so globals.css can name them once. Inter stands in for the display
  face carlton.dev licenses through Adobe Fonts, which cannot be loaded here.
*/
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DomainClaim',
  description:
    'Claim a domain, prove you control it, and see exactly what is happening at each step.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

/**
 * Reads no session and loads no data, so every page under it can be static and a link to one can
 * be prefetched. Headers belong to the layouts below: the app shell for the new screens, and a
 * small layout for each page that still has the old header.
 */
const RootLayout: React.FC<RootLayoutProps> = ({ children }) => (
  // suppressHydrationWarning covers the html element's attributes only. Browser extensions write
  // attributes onto it before React hydrates, which is not a mismatch this code can fix.
  <html lang='en' className={`${inter.variable} ${plexMono.variable}`} suppressHydrationWarning>
    <body className='flex min-h-dvh flex-col bg-bg font-sans text-fg antialiased'>
      {/* Off screen until focused. The first Tab on any page lands here. */}
      <a
        href='#main'
        className='sr-only rounded-md bg-primary px-3 py-2 font-medium text-on-primary text-sm focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
      >
        {appCopy.skipToContent}
      </a>
      {children}
    </body>
  </html>
);

export default RootLayout;
