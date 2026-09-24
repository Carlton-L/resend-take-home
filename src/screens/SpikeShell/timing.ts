// src/screens/SpikeShell/timing.ts
import { useSyncExternalStore } from 'react';

/**
 * Spike only. Time from a link click to the first frame after the new screen commits.
 * Module state, because the click and the paint happen in different components.
 */
export type NavTiming = { path: string; ms: number };

let navStart: number | null = null;
let last: NavTiming | null = null;
const listeners = new Set<() => void>();

export const markNavStart = (): void => {
  navStart = performance.now();
};

export const reportPaint = (path: string): void => {
  if (navStart === null) {
    return;
  }
  const started = navStart;
  navStart = null;
  requestAnimationFrame(() => {
    last = { path, ms: Math.round(performance.now() - started) };
    for (const listener of listeners) {
      listener();
    }
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useLastNav = (): NavTiming | null =>
  useSyncExternalStore(
    subscribe,
    () => last,
    () => null,
  );

/** Depth decides the slide direction: /spike/a is 1, /spike/b/<id> is 2. */
export const depthOf = (path: string): number => (path.startsWith('/spike/b/') ? 2 : 1);
