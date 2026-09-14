// src/lib/claims/evaluate.test.ts
import { describe, expect, it } from 'vitest';
import {
  claimAfterCheck,
  evaluateClaim,
  isExpired,
  shouldMarkVerified,
} from '@/lib/claims/evaluate';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { scriptFor } from '@/lib/dns/testNames';
import { traceName } from '@/lib/dns/trace';

/** Short so a hanging server costs the suite milliseconds instead of seconds. */
const TIMEOUT_MS = 40;

const CLAIM = {
  token: 'MZXW6YTBOIMZXW6YTBOIMZXW6YTBOIQ7',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
};

const NOW = new Date('2026-09-13T12:00:00Z');
const EXPECTED = formatRecordValue(CLAIM.token, CLAIM.expiresAt);

/**
 * Real traces from the demo scripts rather than hand-built objects, so the comparison is tested
 * against the shapes the trace layer actually produces.
 */
const traceFor = async (name: string) => {
  const script = scriptFor(name, EXPECTED);
  if (script === null) {
    throw new Error(`no demo script for ${name}`);
  }
  return traceName(createFakeResolver(script), recordFullName(name), { timeoutMs: TIMEOUT_MS });
};

describe('evaluateClaim', () => {
  it('verifies when a nameserver returns the value this claim issued', async () => {
    const result = evaluateClaim(await traceFor('verified.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'verified',
      record: EXPECTED,
      answeredBy: 'ns1.example-dns.test',
    });
  });

  it('verifies from one live server when another in the zone is dead', async () => {
    const result = evaluateClaim(await traceFor('one-dead-nameserver.test'), CLAIM, NOW);
    expect(result.status).toBe('verified');
  });

  it('finds our record among other services records at the same name', async () => {
    const result = evaluateClaim(await traceFor('crowded-name.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'verified',
      record: EXPECTED,
      answeredBy: 'ns1.example-dns.test',
    });
  });

  it('reports record_not_found with the negative cache window when the name does not exist', async () => {
    const result = evaluateClaim(await traceFor('record-not-found.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'record_not_found',
        queriedName: recordFullName('record-not-found.test'),
        nameservers: ['ns1.example-dns.test', 'ns2.example-dns.test', 'ns3.example-dns.test'],
        negativeTtlSeconds: 300,
      },
    });
  });

  it('reports no_txt_at_name when the name resolves with no TXT on it', async () => {
    const result = evaluateClaim(await traceFor('no-txt-at-name.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: { code: 'no_txt_at_name', queriedName: recordFullName('no-txt-at-name.test') },
    });
  });

  it('reports value_mismatch with what was found and what was expected', async () => {
    const result = evaluateClaim(await traceFor('value-mismatch.test'), CLAIM, NOW);
    expect(result.status).toBe('failed');
    if (result.status !== 'failed' || result.reason.code !== 'value_mismatch') {
      throw new Error('expected value_mismatch');
    }
    expect(result.reason.expected).toBe(EXPECTED);
    expect(result.reason.found).toHaveLength(1);
    expect(result.reason.found[0]).not.toBe(EXPECTED);
  });

  it('reports nameservers_unreachable with the deadline it gave up after', async () => {
    const result = evaluateClaim(await traceFor('nameservers-unreachable.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'nameservers_unreachable',
        attempted: ['ns1.example-dns.test', 'ns2.example-dns.test', 'ns3.example-dns.test'],
        timeoutMs: TIMEOUT_MS,
      },
    });
  });

  it('reports zone_not_found with every level it tried', async () => {
    const result = evaluateClaim(await traceFor('zone-not-found.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'zone_not_found',
        walked: [recordFullName('zone-not-found.test'), 'zone-not-found.test'],
      },
    });
  });

  // The record value is written by whoever controls the zone. Reading expiry from it would let
  // anyone keep a dead claim alive by publishing a later date.
  it('expires from the claim row even when DNS holds a matching record', async () => {
    const expired = { token: CLAIM.token, expiresAt: new Date('2026-09-01T00:00:00Z') };
    const result = evaluateClaim(await traceFor('verified.test'), expired, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: { code: 'token_expired', expiredAt: expired.expiresAt },
    });
  });

  it('treats the moment of expiry as expired', () => {
    expect(isExpired({ token: CLAIM.token, expiresAt: NOW }, NOW)).toBe(true);
  });
});

describe('shouldMarkVerified', () => {
  const found = { status: 'verified', record: 'r', answeredBy: 'ns1.example.com' } as const;
  const missed = {
    status: 'failed',
    reason: { code: 'no_txt_at_name', queriedName: 'x' },
  } as const;

  it('writes only when a pending claim was proved', () => {
    expect(shouldMarkVerified({ status: 'pending' }, found)).toBe(true);
    expect(shouldMarkVerified({ status: 'pending' }, missed)).toBe(false);
  });

  // A claim that already holds its name is already verified, and a record still sitting in a zone
  // does not bring a revoked one back.
  it('leaves every other status alone', () => {
    expect(shouldMarkVerified({ status: 'verified' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'at_risk' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'contested' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'revoked' }, found)).toBe(false);
  });
});

describe('claimAfterCheck', () => {
  const PENDING = { status: 'pending', verifiedAt: null } as const;
  const AT = new Date('2026-09-14T12:00:00Z');

  it('moves the claim only when the write moved the row', () => {
    expect(claimAfterCheck(PENDING, 'verified', AT)).toEqual({
      status: 'verified',
      verifiedAt: AT,
      provedButHeld: false,
    });
  });

  it('leaves the claim where it was when no write was attempted', () => {
    expect(claimAfterCheck(PENDING, null, AT)).toEqual({
      status: 'pending',
      verifiedAt: null,
      provedButHeld: false,
    });
  });

  // The update can hit the partial unique index, which means another account verified the same
  // name between this claim being created and this check landing.
  it('reports control proved against a name another account holds', () => {
    expect(claimAfterCheck(PENDING, 'held_by_another', AT)).toEqual({
      status: 'pending',
      verifiedAt: null,
      provedButHeld: true,
    });
  });

  // The check saying verified is an observation. A failed write means the row did not move, so the
  // screen should not claim it did.
  it('does not promote a claim whose write failed', () => {
    expect(claimAfterCheck(PENDING, 'unavailable', AT).status).toBe('pending');
  });

  it('keeps the date a held claim already carries', () => {
    const earlier = new Date('2026-09-01T09:00:00Z');
    const held = { status: 'verified', verifiedAt: earlier } as const;
    expect(claimAfterCheck(held, null, AT).verifiedAt).toBe(earlier);
  });
});
