// src/screens/AppShell/tone.ts
import type { Tone } from '@/lib/claims/row';

/** The status word's colour in the sidebar and the picker. */
export const TONE_TEXT: Record<Tone, string> = {
  good: 'text-signal',
  wait: 'text-wait',
  warn: 'text-warn',
  neutral: 'text-fg-3',
};
