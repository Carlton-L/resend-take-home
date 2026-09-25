// src/screens/ClaimScreen/DotCover.tsx
'use client';

import type React from 'react';
import { useLayoutEffect, useRef } from 'react';

/** The dot grid's cell, from `.dot-grid` in motion.css. */
const CELL = 26;

const mod = (value: number) => ((value % CELL) + CELL) % CELL;

/**
 * An opaque patch of the page ground with the dot grid painted on it, lined up with the fixed grid
 * behind the screen. It hides what scrolls under the sticky header while the dots carry on through
 * it, so the header reads as part of the page rather than a black band.
 *
 * The offset is measured rather than using `background-attachment: fixed`, which iOS Safari
 * ignores. It is measured again after the screen's enter slide and on resize, since both move it.
 */
const DotCover: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) {
      return;
    }
    let frame = 0;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.backgroundPosition = `${-mod(rect.left)}px ${-mod(rect.top)}px`;
      });
    };
    align();
    window.addEventListener('resize', align);
    window.addEventListener('scroll', align, { passive: true });
    document.addEventListener('animationend', align);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', align);
      window.removeEventListener('scroll', align);
      document.removeEventListener('animationend', align);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden='true'
      className={`dot-grid pointer-events-none absolute bg-bg ${className}`}
    />
  );
};

export default DotCover;
