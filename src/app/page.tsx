// src/app/page.tsx
import Link from 'next/link';
import type React from 'react';

const HomePage: React.FC = () => {
  return (
    <main className='mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6'>
      <h1 className='font-medium text-2xl tracking-tight'>DomainClaim</h1>
      <p className='text-neutral-600 leading-relaxed'>
        Claim a domain, prove you control it, and see exactly what is happening at each step,
        including when verification fails and what to do about it.
      </p>
      <Link
        href='/claim'
        className='w-fit rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
      >
        Claim a domain
      </Link>
    </main>
  );
};

export default HomePage;
