// src/app/page.tsx
import type React from 'react';

const HomePage: React.FC = () => {
  return (
    <main className='mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6'>
      <h1 className='font-medium text-2xl tracking-tight'>DomainClaim</h1>
      <p className='text-neutral-600 leading-relaxed'>
        Claim a domain, prove you control it, and see exactly what is happening at each step,
        including when verification fails and what to do about it.
      </p>
    </main>
  );
};

export default HomePage;
