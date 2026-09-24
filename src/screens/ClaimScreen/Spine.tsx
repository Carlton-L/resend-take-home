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
      const top = root.getBoundingClientRect().top;
      const next: Port[] = [];
      cards.forEach((ref, index) => {
        const el = ref.current;
        if (el === null || !visible[index]) {
          return;
        }
        next.push({
          y: el.getBoundingClientRect().top - top + PORT_Y,
          place: index === current ? 'current' : 'past',
        });
      });
      // Only when something moved, so measuring never renders in a loop.
      setPorts((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    // A card that enters slides up into place, and nothing resizes when it lands.
    root.addEventListener('animationend', measure);
    return () => {
      observer.disconnect();
      root.removeEventListener('animationend', measure);
    };
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
