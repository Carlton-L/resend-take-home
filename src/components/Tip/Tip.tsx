// src/components/Tip/Tip.tsx
'use client';

import type React from 'react';
import { useId } from 'react';

type TipProps = {
  /** The word the tip explains, underlined. */
  children: React.ReactNode;
  /** Bold lead, then the explanation. */
  term: string;
  text: string;
  /** Which edge the bubble lines up with, so it stays on screen. */
  align?: 'left' | 'right';
};

/**
 * A term with a dotted underline and an explanation that opens on hover, focus and tap. The
 * novice gets the words; anyone who knows them ignores the underline.
 */
const Tip: React.FC<TipProps> = ({ children, term, text, align = 'left' }) => {
  const id = useId();
  return (
    <span className='group/tip relative inline'>
      {/* A button, so a keyboard and a tap can reach the explanation. It does nothing else. */}
      <button
        type='button'
        aria-describedby={id}
        className='cursor-help bg-transparent p-0 text-inherit underline decoration-fg-5 decoration-dotted underline-offset-[3px] outline-none hover:decoration-fg focus-visible:decoration-fg'
      >
        {children}
      </button>
      <span
        role='tooltip'
        id={id}
        className={`pointer-events-none invisible absolute top-[calc(100%+8px)] z-50 w-[250px] max-w-[calc(100vw-24px)] -translate-y-[3px] whitespace-normal rounded-md border border-[#303036] bg-[#1b1b1f] px-3 py-2.5 text-left font-normal font-sans text-[12.5px] text-fg normal-case leading-normal tracking-normal opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-[opacity,transform,visibility] duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100 ${align === 'left' ? '-left-2.5' : '-right-2.5'}`}
      >
        <b className='font-mono font-semibold text-[11.5px] text-wait'>{term}</b> {text}
      </span>
    </span>
  );
};

export default Tip;
