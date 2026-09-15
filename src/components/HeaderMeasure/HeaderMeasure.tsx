// src/components/HeaderMeasure/HeaderMeasure.tsx
'use client';

import { usePathname } from 'next/navigation';
import type React from 'react';
import { isRecordPath } from '@/lib/claims/config';

type HeaderMeasureProps = {
  children: React.ReactNode;
};

/**
 * The header shares the measure of the page under it. The layout does not know which page that
 * is, so this reads the path.
 */
const HeaderMeasure: React.FC<HeaderMeasureProps> = ({ children }) => {
  const wide = isRecordPath(usePathname());
  return (
    <div
      className={`mx-auto flex items-center justify-between gap-3 px-6 py-3 ${
        wide ? 'max-w-4xl' : 'max-w-2xl'
      }`}
    >
      {children}
    </div>
  );
};

export default HeaderMeasure;
