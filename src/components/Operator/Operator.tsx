// src/components/Operator/Operator.tsx
import type React from 'react';

type OperatorProps = {
  label: string;
  /** The small chip after the label: a count, or what kind of card it is. */
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** For an animation the card plays, such as the shine. */
  onAnimationEnd?: React.AnimationEventHandler<HTMLElement>;
};

/** A card with a labelled header, the operator box from the design. */
const Operator: React.FC<OperatorProps> = ({
  label,
  badge,
  children,
  className = '',
  onAnimationEnd,
}) => (
  <section
    aria-label={label}
    onAnimationEnd={onAnimationEnd}
    className={`relative rounded-[7px] border border-line bg-surface ${className}`}
  >
    <div className='flex h-10 items-center gap-2.5 border-line border-b px-[18px] max-[720px]:px-3.5'>
      <span className='font-medium font-mono text-[10.5px] text-fg-3 uppercase leading-none tracking-[0.12em]'>
        {label}
      </span>
      {badge !== undefined && (
        <span className='inline-flex h-[18px] items-center rounded border border-line-control px-1.5 font-medium font-mono text-[9.5px] text-fg-3 uppercase leading-none tracking-[0.1em]'>
          {badge}
        </span>
      )}
    </div>
    {children}
  </section>
);

export default Operator;
