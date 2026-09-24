// src/screens/SpikeShell/SpikeShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState, ViewTransition } from 'react';
import SpikeLink from '@/screens/SpikeLink/SpikeLink';
import { depthOf, useLastNav } from '@/screens/SpikeShell/timing';

type SpikeShellProps = {
  children: React.ReactNode;
};

type Mode = 'view' | 'css';

/**
 * Spike only. A shell that stays mounted across screens, with two ways to animate the stage:
 * React's ViewTransition driven by the link's transition type, or a CSS enter animation keyed on
 * the pathname.
 */
const SpikeShell: React.FC<SpikeShellProps> = ({ children }) => {
  const pathname = usePathname();
  const last = useLastNav();
  const [mode, setMode] = useState<Mode>('view');
  const [shellMounts, setShellMounts] = useState(0);

  // Counts how often the shell mounts. It should stay at 1 while moving between screens.
  useEffect(() => {
    setShellMounts((count) => count + 1);
  }, []);

  // Direction for the CSS mode, from the previous path's depth.
  const previous = useRef(pathname);
  const direction = depthOf(pathname) >= depthOf(previous.current) ? 'right' : 'left';
  useEffect(() => {
    previous.current = pathname;
  }, [pathname]);

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8'>
      <div className='flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3 font-mono text-fg-3 text-xs'>
        <span>SPIKE</span>
        <SpikeLink href='/spike/a' className='text-fg underline'>
          /spike/a
        </SpikeLink>
        <button
          type='button'
          onClick={() => setMode(mode === 'view' ? 'css' : 'view')}
          className='rounded-sm border border-line-2 px-2 py-1 text-fg'
        >
          Transition: {mode === 'view' ? 'ViewTransition' : 'CSS keyed'}
        </button>
        <span>shell mounts: {shellMounts}</span>
        <span>last nav: {last === null ? 'none' : `${last.path} ${last.ms}ms`}</span>
      </div>

      <div className='relative overflow-hidden'>
        {mode === 'view' ? (
          <ViewTransition
            key={pathname}
            enter={{
              'nav-forward': 'spike-from-right',
              'nav-back': 'spike-from-left',
              default: 'none',
            }}
            exit={{
              'nav-forward': 'spike-to-left',
              'nav-back': 'spike-to-right',
              default: 'none',
            }}
            default='none'
          >
            <div>{children}</div>
          </ViewTransition>
        ) : (
          <div key={pathname} className={`spike-enter-${direction}`}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpikeShell;
