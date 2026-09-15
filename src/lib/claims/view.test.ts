// src/lib/claims/view.test.ts
import { describe, expect, it } from 'vitest';
import type { ClaimOutcome } from '@/lib/claims/check';
import { checkView } from '@/lib/claims/view';
import type { Trace } from '@/lib/dns/types';

const NAME = '_domainclaim-challenge.example.com';
const NS = 'ns1.googledomains.com';
const NOW = new Date('2026-09-14T12:00:00Z');
const RECORD = 'domainclaim-token=A expiry=2026-09-21';

const trace = (over: Partial<Trace> = {}): Trace => ({
  queriedName: NAME,
  zoneWalk: [],
  zone: 'example.com',
  nameservers: [NS],
  addressLookups: [],
  servers: [
    {
      nameserver: NS,
      address: '198.51.100.7',
      result: { status: 'answered', records: [RECORD], elapsedMs: 92 },
    },
  ],
  negativeTtlSeconds: null,
  outcome: { status: 'records_found', records: [RECORD], answeredBy: NS },
  totalMs: 248,
  ...over,
});

const verified = (over: Partial<ClaimOutcome> = {}): ClaimOutcome => ({
  trace: trace(),
  result: { status: 'verified', record: RECORD, answeredBy: NS },
  status: 'verified',
  verifiedAt: NOW,
  provedButHeld: false,
  ...over,
});

const missing = (over: Partial<ClaimOutcome> = {}): ClaimOutcome => ({
  trace: trace({
    outcome: { status: 'name_not_found' },
    servers: [
      {
        nameserver: NS,
        address: '198.51.100.7',
        result: { status: 'failed', reason: { code: 'name_not_found' }, elapsedMs: 40 },
      },
    ],
  }),
  result: {
    status: 'failed',
    reason: {
      code: 'record_not_found',
      queriedName: NAME,
      nameservers: [NS],
      negativeTtlSeconds: 300,
    },
  },
  status: 'pending',
  verifiedAt: null,
  provedButHeld: false,
  ...over,
});

describe('checkView', () => {
  it('carries the five steps and how many answered', () => {
    const view = checkView(verified());
    expect(view.steps).toHaveLength(5);
    expect(view.answered).toBe(5);
  });

  it('survives a round trip through JSON unchanged', () => {
    const view = checkView(missing());
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });

  it('names the provider in the line that goes at the foot of the page', () => {
    expect(checkView(verified()).provider).toContain('Google');
  });

  it('has nothing to say about the provider when there was no trace', () => {
    expect(checkView(missing({ trace: null })).provider).toBeNull();
  });

  // The cadence stops on this, so each of these is a case where asking again is either pointless
  // or the whole point.
  describe('settled', () => {
    it('is settled once the claim holds its name', () => {
      expect(checkView(verified()).settled).toBe(true);
    });

    it('is not settled while the record has not been added', () => {
      expect(checkView(missing()).settled).toBe(false);
    });

    it('is settled when the token has expired, which no record can undo', () => {
      const expired = missing({
        trace: null,
        result: { status: 'failed', reason: { code: 'token_expired', expiredAt: NOW } },
      });
      expect(checkView(expired).settled).toBe(true);
    });

    it('is settled when control was proved and another account holds the name', () => {
      expect(
        checkView(verified({ status: 'pending', verifiedAt: null, provedButHeld: true })).settled,
      ).toBe(true);
    });

    // The record may come back, and this is the case the product most wants to notice changing.
    it('is not settled when a held claim has lost its record', () => {
      const lost = missing({ status: 'verified', verifiedAt: NOW });
      expect(lost.status).toBe('verified');
      expect(checkView(lost).settled).toBe(false);
      expect(checkView(lost).needsAttention).toBe(true);
    });

    // A check that proved control and a write that did not land. Asking again is what fixes it.
    it('is not settled when control was proved and the row did not move', () => {
      expect(checkView(verified({ status: 'pending', verifiedAt: null })).settled).toBe(false);
    });
  });
});
