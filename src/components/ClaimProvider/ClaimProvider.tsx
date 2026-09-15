// src/components/ClaimProvider/ClaimProvider.tsx
'use client';

import type React from 'react';
import { useCheck } from '@/components/CheckRunner/CheckRunner';

/**
 * Which company answers for this domain, at the foot of the page.
 *
 * Kept out of the status line and out of the chain, because it is the fact a person acts on while
 * looking at the record above it: this record goes in that panel. It is also the only part of the
 * page that cannot exist unless the first two steps passed, so it quietly confirms them even when
 * the chain is closed.
 *
 * Nothing renders until a check has answered, so there is no reserved space and nothing moves when
 * it arrives.
 */
const ClaimProvider: React.FC = () => {
  const { view } = useCheck();
  if (view === null || view.provider === null) {
    return null;
  }

  return <p className='max-w-2xl text-neutral-600 text-sm leading-relaxed'>{view.provider}</p>;
};

export default ClaimProvider;
