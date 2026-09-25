// src/components/Tip/Tip.tsx
'use client';

import type React from 'react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

type TipProps = {
  /** The word the tip explains, underlined. */
  children: React.ReactNode;
  /** Bold lead, then the explanation. */
  term: string;
  text: string;
  /** Which edge the bubble lines up with, before it is nudged onto the screen. */
  align?: 'left' | 'right';
};

/** The space kept between a bubble and the edge of the screen. */
const EDGE = 12;

/**
 * A term with a dotted underline and an explanation that opens on hover, focus and tap. The
 * novice gets the words; anyone who knows them ignores the underline.
 *
 * Tap is its own state: Safari doesn't focus a button when it is tapped, so focus alone never
 * opened it on an iPhone. A second tap, Escape, or moving focus away closes it. The bubble is
 * nudged sideways to stay on screen.
 */
const Tip: React.FC<TipProps> = ({ children, term, text, align = 'left' }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const bubble = bubbleRef.current;
    if (bubble === null) {
      return;
    }
    const rect = bubble.getBoundingClientRect();
    const overRight = rect.right - (window.innerWidth - EDGE);
    const overLeft = EDGE - rect.left;
    setShift(overRight > 0 ? -overRight : overLeft > 0 ? overLeft : 0);
  }, [open]);

  return (
    <span className='group/tip relative inline'>
      {/* A button, so a keyboard and a tap can reach the explanation. It does nothing else. */}
      <button
        type='button'
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onMouseLeave={() => setOpen(false)}
        className='cursor-help bg-transparent p-0 text-inherit underline decoration-fg-5 decoration-dotted underline-offset-[3px] outline-none hover:decoration-fg focus-visible:decoration-fg'
      >
        {children}
      </button>
      <span
        ref={bubbleRef}
        role='tooltip'
        id={id}
        style={shift === 0 ? undefined : { marginLeft: shift }}
        className={`pointer-events-none absolute top-[calc(100%+8px)] z-50 w-[250px] max-w-[calc(100vw-24px)] whitespace-normal rounded-md border border-[#303036] bg-[#1b1b1f] px-3 py-2.5 text-left font-normal font-sans text-[12.5px] text-fg normal-case leading-normal tracking-normal shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-[opacity,transform,visibility] duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100 ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-[3px] opacity-0'} ${align === 'left' ? '-left-2.5' : '-right-2.5'}`}
      >
        <b className='font-mono font-semibold text-[11.5px] text-wait'>{term}</b> {text}
      </span>
    </span>
  );
};

export default Tip;
