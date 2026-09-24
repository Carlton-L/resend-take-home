// src/screens/AppShell/AppShell.tsx
'use client';

import type React from 'react';
import { SWRConfig } from 'swr';
import { ApiError } from '@/client/api';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { SIDEBAR } from '@/lib/ui/config';
import Rail from '@/screens/AppShell/Rail';
import Stage from '@/screens/AppShell/Stage';
import TopBar from '@/screens/AppShell/TopBar';

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * A session that ends while a screen is open. The proxy covers page loads; this covers a fetch
 * that finds the cookie gone.
 */
const onError = (error: unknown) => {
  if (error instanceof ApiError && error.status === 401) {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`);
  }
};

/**
 * The frame every signed in screen sits in. It stays mounted while screens change, so the sidebar
 * and top bar never reload, and the cache it holds is shared by every screen.
 */
const AppShell: React.FC<AppShellProps> = ({ children }) => (
  <SWRConfig value={{ onError }}>
    <div aria-hidden='true' className='dot-grid pointer-events-none fixed inset-0' />
    {SIDEBAR && <Rail />}
    <div
      className={`relative flex min-w-0 flex-1 flex-col overflow-x-clip ${SIDEBAR ? 'rail:pl-14' : ''}`}
    >
      <TopBar />
      <Stage>{children}</Stage>
    </div>
  </SWRConfig>
);

export default AppShell;
