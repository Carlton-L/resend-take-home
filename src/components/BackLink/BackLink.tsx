// src/components/BackLink/BackLink.tsx
import Link from 'next/link';
import type React from 'react';
import { DOMAINS_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';

/**
 * The way back to the list from the two pages under it, above their heading.
 *
 * An arrow and the section's name rather than a breadcrumb trail: the trail's last crumb would
 * repeat the h1 directly beneath it, and a section one level deep has one place to go back to.
 * Together with the h1 this answers the two questions a nav item would, where am I and how do I
 * get back, which is why the header carries no section link.
 */
const BackLink: React.FC = () => (
  <Link
    href={DOMAINS_PATH}
    className='-mb-4 inline-flex w-fit items-center gap-2 rounded-sm font-medium text-fg-2 text-sm transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
  >
    <span aria-hidden='true' className='text-fg-3'>
      &larr;
    </span>
    {claimCopy.list.nav}
  </Link>
);

export default BackLink;
