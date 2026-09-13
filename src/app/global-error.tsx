// src/app/global-error.tsx
'use client';

import type React from 'react';
import { appCopy } from '@/lib/copy/app';
import './globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The last boundary. `error.tsx` sits inside the root layout, so it cannot catch a throw from the
 * layout itself, and the layout reads the session on every request. This one replaces the whole
 * document, which is why it has to render `html` and `body` of its own.
 */
const GlobalError: React.FC<GlobalErrorProps> = ({ error, reset }) => {
  return (
    <html lang='en'>
      <body className='flex min-h-dvh flex-col bg-white text-neutral-900 antialiased'>
        <main className='mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-16 sm:py-24'>
          <h1 className='font-medium text-2xl tracking-tight'>{appCopy.unexpected.title}</h1>
          <p className='text-neutral-600 leading-relaxed'>{appCopy.unexpected.description}</p>
          {error.digest !== undefined && (
            <p className='font-mono text-neutral-500 text-sm'>{error.digest}</p>
          )}
          <button
            type='button'
            onClick={reset}
            className='self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
          >
            {appCopy.unexpected.action}
          </button>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
