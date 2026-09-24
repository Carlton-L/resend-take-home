// src/lib/claims/row.test.ts
import { describe, expect, it } from 'vitest';
import type { ClaimDTO } from '@/lib/claims/dto';
import { claimRowView, formatAgo, formatDay } from '@/lib/claims/row';
import { domainsCopy } from '@/lib/copy/domains';
import { findBannedPhrases } from '@/lib/copy/rules';

const NOW = new Date('2026-09-24T12:00:00Z');

const claim = (over: Partial<ClaimDTO> = {}): ClaimDTO => ({
  id: 'a1',
  name: 'example.com',
  status: 'pending',
  issuedAt: '2026-09-21T12:00:00.000Z',
  expiresAt: '2026-09-28T12:00:00.000Z',
  verifiedAt: null,
  failingSince: null,
  actionNeededSince: null,
  lastCheckedAt: null,
  dnsHost: null,
  dnsPanelUrl: null,
  ...over,
});

describe('formatAgo', () => {
  it.each([
    [10_000, 'just now'],
    [60_000, 'a minute ago'],
    [2 * 60_000, '2 min ago'],
    [70 * 60_000, 'an hour ago'],
    [5 * 3_600_000, '5 hours ago'],
    [30 * 3_600_000, 'a day ago'],
    [3 * 86_400_000, '3 days ago'],
  ])('%i ms reads as %s', (ms, expected) => {
    expect(formatAgo(ms)).toBe(expected);
  });
});

describe('formatDay', () => {
  it('uses the UTC day', () => {
    expect(formatDay(new Date('2026-09-21T23:30:00Z'))).toBe('Sep 21');
  });
});

describe('claimRowView', () => {
  it('shows a pending claim as Pending, waiting, with when it was added', () => {
    expect(claimRowView(claim(), NOW)).toEqual({
      word: 'Pending',
      tone: 'wait',
      badge: 'clock',
      detail: 'Added 3 days ago',
    });
  });

  it('shows a pending claim with a wrong record as needing action', () => {
    const view = claimRowView(claim({ actionNeededSince: '2026-09-22T08:00:00.000Z' }), NOW);
    expect(view).toMatchObject({ word: 'Action needed', tone: 'warn', badge: 'warn' });
    expect(view.detail).toBe('Wrong record since Sep 22');
  });

  it('lets expiry win over a wrong record', () => {
    const view = claimRowView(
      claim({ expiresAt: '2026-09-23T12:00:00.000Z', actionNeededSince: '2026-09-22T08:00:00Z' }),
      NOW,
    );
    expect(view).toMatchObject({ word: 'Expired', badge: 'warn', detail: 'Expired Sep 23' });
  });

  it('says when a verified claim was last checked', () => {
    const view = claimRowView(
      claim({
        status: 'verified',
        verifiedAt: '2026-09-02T10:00:00.000Z',
        lastCheckedAt: '2026-09-24T11:58:00.000Z',
      }),
      NOW,
    );
    expect(view).toEqual({
      word: 'Verified',
      tone: 'good',
      badge: null,
      detail: 'Checked 2 min ago',
    });
  });

  it('falls back to the verified date before any check is stored', () => {
    const view = claimRowView(
      claim({ status: 'verified', verifiedAt: '2026-09-02T10:00:00.000Z' }),
      NOW,
    );
    expect(view.detail).toBe('Verified Sep 2');
  });

  it('gives an at-risk claim the time its record went missing today', () => {
    const view = claimRowView(
      claim({ status: 'at_risk', failingSince: '2026-09-24T09:12:00.000Z' }),
      NOW,
    );
    expect(view).toMatchObject({ word: 'At risk', tone: 'warn', badge: 'warn' });
    expect(view.detail).toBe('Record missing since 09:12 UTC');
  });

  it('gives the day when it went missing before today', () => {
    const view = claimRowView(
      claim({ status: 'at_risk', failingSince: '2026-09-20T09:12:00.000Z' }),
      NOW,
    );
    expect(view.detail).toBe('Record missing since Sep 20');
  });
});

describe('domainsCopy', () => {
  it('follows the copy rules', () => {
    const strings: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === 'string') {
        strings.push(value);
      } else if (typeof value === 'function') {
        strings.push(String((value as (arg: string) => unknown)('x')));
      } else if (value !== null && typeof value === 'object') {
        Object.values(value).forEach(collect);
      }
    };
    collect(domainsCopy);
    expect(findBannedPhrases(strings)).toEqual([]);
  });
});
