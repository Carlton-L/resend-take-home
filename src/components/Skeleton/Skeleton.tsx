// src/components/Skeleton/Skeleton.tsx
import type React from 'react';

type SkeletonProps = {
  /** Width and height, as the utilities the surrounding layout is already written in. */
  className?: string;
};

/**
 * One grey block standing in for a line of text or a card that has not arrived.
 *
 * Hidden from the accessibility tree. The route's own fallback carries the sentence that says what
 * is loading, so a screen reader hears that once rather than a shape per line.
 */
const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <span
    aria-hidden='true'
    className={`block animate-pulse rounded bg-neutral-200 motion-reduce:animate-none ${className}`}
  />
);

export default Skeleton;
