// src/lib/claims/listView.ts
import type { ClaimRowView, Tone } from '@/lib/claims/row';

/**
 * The list's filter, sort and attention notice, as they worked before the rebuild. The filter is
 * a pill word, or `attention` for every row whose next move is the person's.
 */
export const ATTENTION = 'attention';
export const SORTS = ['attention', 'newest', 'name'] as const;
export type ListSort = (typeof SORTS)[number];

export const isSort = (value: string | null): value is ListSort =>
  SORTS.includes(value as ListSort);

/** Needs attention first, then waiting, then held. Stable, so newest still leads in each group. */
const RANK: Record<Tone, number> = { warn: 0, wait: 1, neutral: 1, good: 2 };

export type ListRow<T> = { claim: T & { name: string }; view: ClaimRowView };

export const needsAttention = (view: ClaimRowView): boolean => view.tone === 'warn';

/** One chip per pill word on the list, in the order they first appear, with a count. */
export const chipsFor = <T>(rows: ListRow<T>[]): [string, number][] => {
  const seen = new Map<string, number>();
  for (const { view } of rows) {
    seen.set(view.word, (seen.get(view.word) ?? 0) + 1);
  }
  return [...seen.entries()];
};

/** The filter in the URL, or null when it names nothing on the list. */
export const activeFilter = <T>(rows: ListRow<T>[], filter: string | null): string | null =>
  filter === ATTENTION || rows.some(({ view }) => view.word === filter) ? filter : null;

export const shownRows = <T>(
  rows: ListRow<T>[],
  filter: string | null,
  sort: ListSort,
): ListRow<T>[] => {
  const kept =
    filter === null
      ? rows
      : filter === ATTENTION
        ? rows.filter(({ view }) => needsAttention(view))
        : rows.filter(({ view }) => view.word === filter);
  if (sort === 'newest') {
    return kept;
  }
  return [...kept].sort((a, b) =>
    sort === 'name'
      ? a.claim.name.localeCompare(b.claim.name)
      : RANK[a.view.tone] - RANK[b.view.tone],
  );
};

/**
 * What Show filters to. When every row that needs attention has the same word, that word's chip,
 * so the filter shows as pressed. Otherwise every row that needs attention.
 */
export const showTarget = <T>(rows: ListRow<T>[]): string => {
  const words = new Set(
    rows.filter(({ view }) => needsAttention(view)).map(({ view }) => view.word),
  );
  return words.size === 1 ? ([...words][0] ?? ATTENTION) : ATTENTION;
};

/** How many rows need attention, or 0 when the list already shows exactly those rows. */
export const attentionCount = <T>(rows: ListRow<T>[], filter: string | null): number => {
  const count = rows.filter(({ view }) => needsAttention(view)).length;
  if (count === 0 || filter === ATTENTION) {
    return 0;
  }
  return filter !== null && showTarget(rows) === filter ? 0 : count;
};
