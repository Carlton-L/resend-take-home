// src/screens/ClaimScreen/buttons.ts

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[7px] border font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-45';

/** The button sizes and weights from the design. */
export const BUTTON = {
  regular: `${BASE} h-[34px] px-3.5 text-[13px] border-line-control bg-surface-2 text-fg hover:border-[#36363b] hover:bg-surface-3`,
  small: `${BASE} h-7 px-2.5 text-xs border-line-control bg-surface-2 text-fg hover:border-[#36363b] hover:bg-surface-3`,
  primary: `${BASE} h-[34px] min-w-28 px-3.5 text-[13px] border-signal bg-signal text-on-signal hover:border-signal-hover hover:bg-signal-hover`,
  primarySmall: `${BASE} h-7 px-2.5 text-xs border-signal bg-signal text-on-signal hover:border-signal-hover hover:bg-signal-hover`,
  danger: `${BASE} h-[34px] px-3.5 text-[13px] border-warn/50 bg-transparent text-warn hover:bg-warn/10`,
};

/** The arrow after a link that leaves the site. */
export const OUT_ARROW_PATH = 'M6 3h7v7M13 3L4 12';
