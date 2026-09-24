// src/client/shellStore.ts
import { useSyncExternalStore } from 'react';

/**
 * Small pieces of state the shell and the screens share, which don't come from the API.
 *
 * - `released`: the name of a claim just released, for the notice under the list.
 * - `added`: the id of a claim just created, so its new row animates in once.
 * - `focusClaim`: set by Claim a domain in the sidebar or picker. The input focuses, shines and
 *   clears it, so it plays once even if the domains screen mounts after the click.
 */
type ShellState = { released: string | null; added: string | null; focusClaim: boolean };

let state: ShellState = { released: null, added: null, focusClaim: false };
const listeners = new Set<() => void>();

const set = (next: Partial<ShellState>) => {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const SERVER: ShellState = { released: null, added: null, focusClaim: false };

export const useShell = (): ShellState =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );

export const shell = {
  released: (name: string | null) => set({ released: name }),
  added: (id: string | null) => set({ added: id }),
  focusClaimInput: () => set({ focusClaim: true }),
  claimInputFocused: () => set({ focusClaim: false }),
};
