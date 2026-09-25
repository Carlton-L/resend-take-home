// src/screens/AppShell/TopBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useSWRConfig } from 'swr';
import { signOut } from '@/client/api';
import { useClaims, useMe } from '@/client/queries';
import { DOMAINS_PATH } from '@/lib/claims/config';
import { domainsCopy } from '@/lib/copy/domains';
import { SIDEBAR } from '@/lib/ui/config';
import DomainPicker from '@/screens/AppShell/DomainPicker';

const CRUMB =
  '-ml-1.5 rounded-[5px] px-1.5 py-1 text-[13px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2';

/** The claim id in the path, or null on any other screen. */
const claimIdIn = (pathname: string): string | null =>
  pathname.startsWith('/claim/') ? (pathname.split('/')[2] ?? null) : null;

const Crumbs: React.FC = () => {
  const pathname = usePathname();
  const { data: claims } = useClaims();
  const id = claimIdIn(pathname);

  if (id === null) {
    return (
      <span aria-current='page' className='-ml-1.5 px-1.5 py-1 text-[13px] text-fg'>
        {domainsCopy.heading}
      </span>
    );
  }

  const name = claims?.find((claim) => claim.id === id)?.name ?? '';
  return (
    <>
      <Link href={DOMAINS_PATH} className={CRUMB}>
        {domainsCopy.heading}
      </Link>
      <span aria-hidden='true' className='text-fg-5'>
        /
      </span>
      {SIDEBAR && (
        <span
          aria-current='page'
          className='truncate font-medium font-mono text-[13px] text-fg norail:hidden'
        >
          {name}
        </span>
      )}
      <span className={SIDEBAR ? 'hidden min-w-0 norail:flex' : 'flex min-w-0'}>
        <DomainPicker currentId={id} currentName={name} />
      </span>
    </>
  );
};

const Who: React.FC = () => {
  const { data: me } = useMe();
  const name = me === undefined ? '' : (me.email.split('@')[0] ?? '');

  const router = useRouter();
  const { mutate } = useSWRConfig();
  // No reload: the home page is static, so it can open at once. The cache is cleared first,
  // so the next account to sign in on this tab never sees this one's claims.
  const leave = async () => {
    await signOut();
    await mutate(() => true, undefined, { revalidate: false });
    router.replace('/');
  };

  return (
    <div className='flex items-center gap-2.5 text-[12.5px] text-fg-3'>
      <span className='max-w-[30vw] truncate max-[720px]:hidden' title={me?.email}>
        {name}
      </span>
      <span
        aria-hidden='true'
        className='grid size-[26px] place-items-center rounded-full border border-line-control bg-[linear-gradient(135deg,#2a2a2e,#1a1a1d)] font-medium font-mono text-[10px] text-fg'
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
      <button
        type='button'
        onClick={leave}
        className='inline-flex h-7 items-center rounded-[7px] px-2.5 font-medium text-fg-3 text-xs transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
      >
        {domainsCopy.signOut}
      </button>
    </div>
  );
};

/** Where you are, and who you are signed in as. */
const TopBar: React.FC = () => (
  <header className='sticky top-0 z-20 h-13 border-line border-b bg-[rgb(10_10_11/0.82)] backdrop-blur-[10px]'>
    <div className='page-wrap flex h-full items-center gap-2.5'>
      <nav aria-label='Breadcrumb' className='flex min-w-0 flex-1 items-center gap-2.5'>
        <Crumbs />
      </nav>
      <Who />
    </div>
  </header>
);

export default TopBar;
