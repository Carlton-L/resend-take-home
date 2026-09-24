// src/screens/DomainsScreen/DomainsScreen.tsx
'use client';

import type React from 'react';
import { useEffect } from 'react';
import { shell } from '@/client/shellStore';
import { domainsCopy } from '@/lib/copy/domains';
import ClaimInput from '@/screens/DomainsScreen/ClaimInput';
import ClaimsList from '@/screens/DomainsScreen/ClaimsList';
import ReleasedNotice from '@/screens/DomainsScreen/ReleasedNotice';

/** The list of claims, and where a new one starts. */
const DomainsScreen: React.FC = () => {
  // A new row animates in once. Leaving the screen ends that, so it doesn't replay on return.
  useEffect(() => () => shell.added(null), []);

  return (
    <div className='page-wrap pt-[92px] pb-[120px] max-[720px]:pt-7'>
      <h1 className='mb-[26px] font-semibold text-[34px] leading-[1.2] tracking-[-0.02em]'>
        {domainsCopy.heading}
      </h1>
      <ClaimInput />
      <ClaimsList />
      <ReleasedNotice />
    </div>
  );
};

export default DomainsScreen;
