// src/components/Favicon/Favicon.tsx
import type React from 'react';
import type { Badge } from '@/lib/claims/row';

type FaviconProps = {
  badge: Badge;
  /** 36 in lists and the sidebar, 28 in the picker. */
  size?: 28 | 36;
  /**
   * The surface behind the badge ring, so the badge reads as cut out of it. `row` follows a
   * parent with `group/row` from surface to surface-2 on hover.
   */
  ring?: 'surface' | 'surface-2' | 'row';
};

/** Stands in for a site's own icon until favicons are fetched. */
const Globe: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 16 16'
    width='18'
    height='18'
    fill='none'
    stroke='#8f8f8a'
    strokeWidth='1.1'
  >
    <circle cx='8' cy='8' r='6.2' />
    <ellipse cx='8' cy='8' rx='2.6' ry='6.2' />
    <path d='M1.8 8h12.4M2.8 4.8h10.4M2.8 11.2h10.4' />
  </svg>
);

const Clock: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 12 12'
    width='9'
    height='9'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.3'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M3 1.5h6M3 10.5h6' />
    <path d='M3.6 1.5c0 2.4 2.4 3 2.4 4.5S3.6 8.1 3.6 10.5M8.4 1.5c0 2.4-2.4 3-2.4 4.5s2.4 2.1 2.4 4.5' />
  </svg>
);

const Warn: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 12 12'
    width='9'
    height='9'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.4'
    strokeLinejoin='round'
    strokeLinecap='round'
    className='-mt-px'
  >
    <path d='M6 1.6l4.6 8.2H1.4z' />
    <path d='M6 4.8v2.2M6 8.4v.1' />
  </svg>
);

const RING = {
  surface: 'shadow-[0_0_0_2px_var(--color-surface)]',
  'surface-2': 'shadow-[0_0_0_2px_var(--color-surface-2)]',
  row: 'shadow-[0_0_0_2px_var(--color-surface)] group-hover/row:shadow-[0_0_0_2px_var(--color-surface-2)]',
};

/**
 * A claim's icon, with a badge only while the claim needs something: an hourglass while it waits,
 * a triangle when it is wrong or at risk. Decorative: the name and the status word carry it.
 */
const Favicon: React.FC<FaviconProps> = ({ badge, size = 36, ring = 'surface' }) => (
  <span
    aria-hidden='true'
    className={`relative grid flex-none place-items-center ${size === 36 ? 'size-9' : 'size-7'}`}
  >
    <Globe />
    {badge !== null && (
      <span
        className={`absolute right-0.5 bottom-0.5 grid size-[15px] place-items-center rounded-full bg-bg ${RING[ring]} ${badge === 'clock' ? 'text-wait' : 'text-warn'}`}
      >
        {badge === 'clock' ? <Clock /> : <Warn />}
      </span>
    )}
  </span>
);

export default Favicon;
