// src/screens/AppShell/Stage.tsx
'use client';

import { usePathname } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef } from 'react';

type StageProps = {
  children: React.ReactNode;
};

/** The domains list is 1 deep, a claim is 2. Deeper comes in from the right. */
const depthOf = (pathname: string): number => (pathname.startsWith('/claim/') ? 2 : 1);

/**
 * Where screens change. Keyed on the path, so each screen plays its enter animation as it arrives.
 * The first screen after a page load does not animate.
 */
const Stage: React.FC<StageProps> = ({ children }) => {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  const from = previous.current;
  const enter =
    from === null || from === pathname
      ? ''
      : depthOf(pathname) >= depthOf(from)
        ? 'screen-in-r'
        : 'screen-in-l';

  useEffect(() => {
    previous.current = pathname;
  }, [pathname]);

  return (
    <main id='main' key={pathname} className={`relative flex flex-1 flex-col ${enter}`}>
      {children}
    </main>
  );
};

export default Stage;
