// src/screens/SignInScreen/DemoFrame.tsx
'use client';

import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { DEMO_HEIGHT, DEMO_PATH, DEMO_WIDTH } from '@/screens/SignInDemo/config';

/**
 * The demo, scaled to fit its column. It runs in a frame at a fixed desktop width, so the app's own
 * layout rules see a desktop and the copy looks like the app on a laptop at any screen size.
 *
 * Decorative: hidden from assistive technology, out of the tab order, and not clickable.
 */
const DemoFrame: React.FC<{ className?: string }> = ({ className = '' }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box === null) {
      return;
    }
    const measure = () => setScale(box.clientWidth / DEMO_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-w-0 ${className}`} aria-hidden='true'>
      <div
        ref={boxRef}
        className='relative overflow-hidden rounded-[10px] border border-line-control bg-bg shadow-[0_30px_80px_rgba(0,0,0,0.55)]'
        style={{ height: scale === 0 ? undefined : Math.round(DEMO_HEIGHT * scale) }}
      >
        {scale > 0 && (
          <iframe
            src={DEMO_PATH}
            title='DomainClaim demo'
            tabIndex={-1}
            width={DEMO_WIDTH}
            height={DEMO_HEIGHT}
            className='pointer-events-none absolute top-0 left-0 origin-top-left border-0'
            style={{ transform: `scale(${scale})` }}
          />
        )}
      </div>
    </div>
  );
};

export default DemoFrame;
