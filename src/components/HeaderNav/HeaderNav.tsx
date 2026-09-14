// src/components/HeaderNav/HeaderNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { CLAIM_PATH, DOMAINS_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';

/**
 * The two destinations a signed in account has, with the one being looked at marked.
 *
 * A client component for one reason: the current path. The header is rendered in the layout, which
 * is a Server Component and does not know which page is inside it, so the alternative is threading
 * a path prop down from every page. `usePathname` reads it where it is used.
 *
 * The current page keeps the button shape and loses the fill. A filled control that goes nowhere
 * invites a press that does nothing, and the quiet one still reads as part of the same pair. The
 * border is on both variants so the two do not differ in height.
 */
const BASE_CLASS =
  'rounded-md border px-3 py-1.5 font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2';
const CURRENT_CLASS = 'border-neutral-300 bg-white text-neutral-900';
const OTHER_CLASS = 'border-transparent bg-neutral-900 text-white hover:bg-neutral-700';

const DESTINATIONS = [
  { href: DOMAINS_PATH, label: claimCopy.list.nav },
  { href: CLAIM_PATH, label: claimCopy.list.claim },
];

const HeaderNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className='flex items-center gap-2'>
      {DESTINATIONS.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`${BASE_CLASS} ${current ? CURRENT_CLASS : OTHER_CLASS}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default HeaderNav;
