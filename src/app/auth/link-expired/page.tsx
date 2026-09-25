// src/app/auth/link-expired/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';
import Operator from '@/components/Operator/Operator';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { BUTTON } from '@/screens/ClaimScreen/buttons';

export const metadata: Metadata = {
  title: 'Link expired',
  robots: { index: false, follow: false },
};

/**
 * One screen for expired, already used, and followed by a scanner. The product cannot tell those
 * apart from a refused token, and the next step is the same for all three, so naming a cause would
 * mean guessing at one.
 */
const LinkExpiredPage: React.FC = () => {
  const copy = signInCopy.dead;
  return (
    <div className='page-wrap flex flex-1 items-center justify-center py-12'>
      <Operator
        label={copy.label}
        badge={copy.badge}
        badgeTone='warn'
        className='w-[min(460px,100%)]'
      >
        <div className='px-[26px] pt-[26px] pb-[22px] max-[720px]:px-5'>
          <h1 className='mb-2 font-semibold text-2xl tracking-[-0.02em]'>{copy.title}</h1>
          <p className='mb-[22px] text-fg-3'>{copy.description}</p>
          <Link href={SIGN_IN_PATH} className={BUTTON.primary}>
            {copy.action}
          </Link>
        </div>
      </Operator>
    </div>
  );
};

export default LinkExpiredPage;
