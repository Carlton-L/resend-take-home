// src/screens/SpikeLink/SpikeLink.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { depthOf, markNavStart } from '@/screens/SpikeShell/timing';

type SpikeLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

/** Spike only. Tags the navigation with a direction and starts the timer. */
const SpikeLink: React.FC<SpikeLinkProps> = ({ href, children, className }) => {
  const pathname = usePathname();
  const type = depthOf(href) >= depthOf(pathname) ? 'nav-forward' : 'nav-back';

  return (
    <Link href={href} transitionTypes={[type]} onNavigate={markNavStart} className={className}>
      {children}
    </Link>
  );
};

export default SpikeLink;
