// src/screens/ClaimScreen/Spine.tsx
'use client';

import type React from 'react';
import { type RefObject, useLayoutEffect, useState } from 'react';

/**
 * How far left of the cards the line runs. Half the narrowest gutter (24px), so on a small window
 * it sits in the middle between the sidebar and the cards, and on a wide one it stays this close.
 */
const LINE_GAP = 12;
/** The middle of a card header, where each card's port sits. */
const PORT_Y = 19.5;

type SpineProps = {
  container: RefObject<HTMLDivElement | null>;
  cards: RefObject<HTMLDivElement | null>[];
  visible: boolean[];
  current: number;
  /** Changes whenever the cards may have moved. */
  layoutKey: string;
};

type Port = { y: number; place: 'past' | 'current' };

/**
 * Where an element sits inside `root`, from layout rather than the screen. Cards slide up as they
 * enter, and measuring them on screen mid-slide put the line too low until the slide ended.
 * Offsets ignore transforms, so the line is in its final place from the first frame.
 */
const layoutTop = (el: HTMLElement, root: HTMLElement): number => {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node !== null && node !== root) {
    y += node.offsetTop;
    const parent: Element | null = node.offsetParent;
    node = parent instanceof HTMLElement ? parent : null;
  }
  if (node === root) {
    return y;
  }
  // `root` isn't an offset parent of the card. Fall back to the screen, minus root's own offset.
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top;
};

/**
 * One straight grey line left of the cards, joining a port on each. The current card's port is
 * filled. Hidden on phones, where the cards run edge to edge.
 */
const Spine: React.FC<SpineProps> = ({ container, cards, visible, current, layoutKey }) => {
  const [ports, setPorts] = useState<Port[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: layoutKey stands for everything that moves the cards
  useLayoutEffect(() => {
    const root = container.current;
    if (root === null) {
      return;
    }
    const measure = () => {
      const next: Port[] = [];
      cards.forEach((ref, index) => {
        const el = ref.current;
        if (el === null || !visible[index]) {
          return;
        }
        next.push({
          y: layoutTop(el, root) + PORT_Y,
          place: index === current ? 'current' : 'past',
        });
      });
      // Only when something moved, so measuring never renders in a loop.
      setPorts((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [layoutKey]);

  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0 max-[720px]:hidden'>
      {ports.slice(1).map((port, index) => {
        const from = ports[index];
        return from === undefined ? null : (
          <span
            key={`v-${port.y}`}
            className='absolute w-[1.5px] bg-line-2'
            style={{ left: -LINE_GAP - 0.75, top: from.y, height: port.y - from.y }}
          />
        );
      })}
      {ports.map((port) => (
        <span key={`h-${port.y}`}>
          <span
            className='absolute h-[1.5px] bg-line-2'
            style={{ left: -LINE_GAP, top: port.y - 0.75, width: LINE_GAP }}
          />
          <span
            className={`absolute z-[3] size-[9px] rounded-full border-[1.5px] border-signal transition-colors duration-300 ${port.place === 'current' ? 'bg-signal' : 'bg-bg'}`}
            style={{ left: -LINE_GAP - 4.5, top: port.y - 4.5 }}
          />
        </span>
      ))}
    </div>
  );
};

export default Spine;
