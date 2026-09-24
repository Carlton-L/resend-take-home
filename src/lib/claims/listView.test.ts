// src/lib/claims/listView.test.ts
import { describe, expect, it } from 'vitest';
import {
  ATTENTION,
  activeFilter,
  attentionCount,
  chipsFor,
  type ListRow,
  shownRows,
  showTarget,
} from '@/lib/claims/listView';
import type { ClaimRowView } from '@/lib/claims/row';

const view = (word: string, tone: ClaimRowView['tone']): ClaimRowView => ({
  word,
  tone,
  badge: null,
  detail: '',
});

const row = (name: string, word: string, tone: ClaimRowView['tone']): ListRow<{ id: string }> => ({
  claim: { id: name, name },
  view: view(word, tone),
});

// Newest first, the order the API sends.
const rows = [
  row('carlton.dev', 'Verified', 'good'),
  row('futurity.science', 'Pending', 'wait'),
  row('fs.cards', 'At risk', 'warn'),
];

const names = (list: ListRow<{ id: string }>[]) => list.map(({ claim }) => claim.name);

describe('chipsFor', () => {
  it('gives one chip per word with its count, in list order', () => {
    expect(chipsFor([...rows, row('b.dev', 'Pending', 'wait')])).toEqual([
      ['Verified', 1],
      ['Pending', 2],
      ['At risk', 1],
    ]);
  });
});

describe('shownRows', () => {
  it('puts the rows that need attention first by default, then waiting, then held', () => {
    expect(names(shownRows(rows, null, 'attention'))).toEqual([
      'fs.cards',
      'futurity.science',
      'carlton.dev',
    ]);
  });

  it('keeps the API order for newest first', () => {
    expect(names(shownRows(rows, null, 'newest'))).toEqual(names(rows));
  });

  it('sorts by name', () => {
    expect(names(shownRows(rows, null, 'name'))).toEqual([
      'carlton.dev',
      'fs.cards',
      'futurity.science',
    ]);
  });

  it('filters by a word', () => {
    expect(names(shownRows(rows, 'Pending', 'attention'))).toEqual(['futurity.science']);
  });

  it('filters to every row that needs attention', () => {
    const more = [...rows, row('old.dev', 'Expired', 'warn')];
    expect(names(shownRows(more, ATTENTION, 'newest'))).toEqual(['fs.cards', 'old.dev']);
  });
});

describe('activeFilter', () => {
  it('drops a word nothing on the list has', () => {
    expect(activeFilter(rows, 'Revoked')).toBeNull();
    expect(activeFilter(rows, 'At risk')).toBe('At risk');
    expect(activeFilter(rows, ATTENTION)).toBe(ATTENTION);
  });
});

describe('showTarget and attentionCount', () => {
  it('shows the one word the rows that need attention share, as a chip', () => {
    expect(showTarget(rows)).toBe('At risk');
  });

  it('falls back to the attention filter when they have different words', () => {
    expect(showTarget([...rows, row('old.dev', 'Expired', 'warn')])).toBe(ATTENTION);
  });

  it('counts them, and hides the count once the list shows exactly them', () => {
    expect(attentionCount(rows, null)).toBe(1);
    expect(attentionCount(rows, 'Pending')).toBe(1);
    expect(attentionCount(rows, 'At risk')).toBe(0);
    expect(attentionCount(rows, ATTENTION)).toBe(0);
  });

  it('is 0 when nothing needs attention', () => {
    expect(attentionCount(rows.slice(0, 2), null)).toBe(0);
  });
});
