// src/lib/claims/steps.test.ts
import { describe, expect, it } from 'vitest';
import type { ClaimOutcome } from '@/lib/claims/check';
import type { CheckResult, ClaimStatus } from '@/lib/claims/state';
import { answeredCount, needsAttention, STEP_KEYS, stepsFor, stoppedAt } from '@/lib/claims/steps';
import type { ServerQuery, Trace } from '@/lib/dns/types';

const NAME = '_domainclaim-challenge.example.com';
const NS = 'ns1.example.com';
const NOW = new Date('2026-09-14T12:00:00Z');

const server = (status: 'answered' | 'failed'): ServerQuery => ({
  nameserver: NS,
  address: '198.51.100.7',
  result:
    status === 'answered'
      ? { status: 'answered', records: ['domainclaim-token=A expiry=Z'], elapsedMs: 92 }
      : { status: 'failed', reason: { code: 'timed_out', timeoutMs: 2000 }, elapsedMs: 2000 },
});

const trace = (over: Partial<Trace> = {}): Trace => ({
  queriedName: NAME,
  zoneWalk: [],
  zone: 'example.com',
  nameservers: [NS],
  addressLookups: [],
  servers: [server('answered')],
  negativeTtlSeconds: null,
  outcome: { status: 'records_found', records: ['domainclaim-token=A expiry=Z'], answeredBy: NS },
  totalMs: 248,
  ...over,
});

const outcome = (over: Partial<ClaimOutcome> = {}): ClaimOutcome => ({
  trace: trace(),
  result: { status: 'verified', record: 'domainclaim-token=A expiry=Z', answeredBy: NS },
  status: 'verified' as ClaimStatus,
  verifiedAt: NOW,
  provedButHeld: false,
  ...over,
});

const failed = (reason: Extract<CheckResult, { status: 'failed' }>['reason']): CheckResult => ({
  status: 'failed',
  reason,
});

const states = (o: ClaimOutcome) => stepsFor(o).map((step) => step.state);

describe('stepsFor', () => {
  it('always returns the five steps in order', () => {
    expect(stepsFor(outcome()).map((step) => step.key)).toEqual([...STEP_KEYS]);
  });

  it('marks every step done on a claim that verified', () => {
    expect(states(outcome())).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(answeredCount(stepsFor(outcome()))).toBe(5);
  });

  // The first check on every new claim looks for a record nobody has added. Marking that wrong
  // reports the product working correctly as a fault.
  it('waits rather than failing when the record is simply not there yet', () => {
    const o = outcome({
      trace: trace({ outcome: { status: 'no_records' }, negativeTtlSeconds: 300 }),
      result: failed({
        code: 'record_not_found',
        queriedName: NAME,
        nameservers: [NS],
        negativeTtlSeconds: 300,
      }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['done', 'done', 'wait', 'idle', 'idle']);
  });

  // Same step, different answer: a name that exists with no TXT on it needs the person.
  it('fails the record step when the name answers with the wrong type', () => {
    const o = outcome({
      trace: trace({ outcome: { status: 'no_records' } }),
      result: failed({ code: 'no_txt_at_name', queriedName: NAME }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['done', 'done', 'wrong', 'idle', 'idle']);
  });

  // The bug this test exists for: a server that says NXDOMAIN was reached, so step 02 passed and
  // the message belongs to step 03. Asking "did anyone hand us records" put it on the wrong row.
  it('passes the nameserver step when a server answered with nothing', () => {
    const o = outcome({
      trace: trace({
        servers: [
          {
            nameserver: NS,
            address: '198.51.100.7',
            result: { status: 'failed', reason: { code: 'name_not_found' }, elapsedMs: 40 },
          },
        ],
        outcome: { status: 'name_not_found' },
      }),
      result: failed({
        code: 'record_not_found',
        queriedName: NAME,
        nameservers: [NS],
        negativeTtlSeconds: 300,
      }),
      status: 'pending',
      verifiedAt: null,
    });
    const steps = stepsFor(o);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'wait', 'idle', 'idle']);
    expect(steps[1]?.answer).toContain(NS);
    expect(steps[1]?.fix).toBeNull();
    expect(steps[2]?.fix).not.toBeNull();
  });

  it('waits on silent nameservers, because slow and dead look the same from here', () => {
    const o = outcome({
      trace: trace({
        servers: [server('failed')],
        outcome: { status: 'nameservers_unreachable', attempted: [NS], timeoutMs: 2000 },
      }),
      result: failed({ code: 'nameservers_unreachable', attempted: [NS], timeoutMs: 2000 }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['done', 'wait', 'idle', 'idle', 'idle']);
  });

  it('stops at the first step on a domain with no nameservers', () => {
    const o = outcome({
      trace: trace({
        zone: null,
        nameservers: [],
        servers: [],
        outcome: { status: 'zone_not_found', walked: [NAME, 'example.com'] },
      }),
      result: failed({ code: 'zone_not_found', walked: [NAME, 'example.com'] }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['wrong', 'idle', 'idle', 'idle', 'idle']);
  });

  // Decided from the row before any query, so no step was ever asked.
  it('reports an expired token without a trace to read', () => {
    const o = outcome({
      trace: null,
      result: failed({ code: 'token_expired', expiredAt: NOW }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['wrong', 'idle', 'idle', 'idle', 'idle']);
  });

  it('fails the token step when a record is there with another value', () => {
    const o = outcome({
      result: failed({
        code: 'value_mismatch',
        expected: 'domainclaim-token=A expiry=Z',
        found: ['v=spf1 ~all'],
      }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(states(o)).toEqual(['done', 'done', 'done', 'wrong', 'idle']);
  });

  // Control proved, and the unique index refused the write because someone else got there first.
  it('fails the last step when another account holds the name', () => {
    const o = outcome({ status: 'pending', verifiedAt: null, provedButHeld: true });
    expect(states(o)).toEqual(['done', 'done', 'done', 'done', 'wrong']);
  });

  it('carries a message on the step that stopped and on no other', () => {
    const o = outcome({
      result: failed({ code: 'value_mismatch', expected: 'x', found: ['y'] }),
      status: 'pending',
      verifiedAt: null,
    });
    const withFix = stepsFor(o).filter((step) => step.fix !== null);
    expect(withFix).toHaveLength(1);
    expect(withFix[0]?.key).toBe('token');
    expect(withFix[0]?.fix?.action.length).toBeGreaterThan(0);
  });

  it('names the nameserver that answered rather than every one asked', () => {
    const step = stepsFor(outcome()).find((s) => s.key === 'nameservers');
    expect(step?.answer).toContain(NS);
  });
});

describe('needsAttention', () => {
  // The one silent case: a claim nobody has added a record for. Everything else opens.
  it('stays quiet only when the record is simply not there yet', () => {
    const quiet = outcome({
      trace: trace({ outcome: { status: 'no_records' } }),
      result: failed({
        code: 'record_not_found',
        queriedName: NAME,
        nameservers: [NS],
        negativeTtlSeconds: null,
      }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(needsAttention(stepsFor(quiet))).toBe(false);
  });

  it('opens on a broken zone, which a person should not have to discover later', () => {
    const broken = outcome({
      trace: trace({
        zone: null,
        nameservers: [],
        servers: [],
        outcome: { status: 'zone_not_found', walked: [NAME] },
      }),
      result: failed({ code: 'zone_not_found', walked: [NAME] }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(needsAttention(stepsFor(broken))).toBe(true);
  });

  it('opens when everything passed, because five green rows are the receipt', () => {
    expect(needsAttention(stepsFor(outcome()))).toBe(true);
  });
});

describe('stoppedAt', () => {
  it('is null when nothing stopped the check', () => {
    expect(stoppedAt(stepsFor(outcome()))).toBeNull();
  });

  it('is the first step that did not pass', () => {
    const o = outcome({
      trace: trace({ outcome: { status: 'no_records' } }),
      result: failed({
        code: 'record_not_found',
        queriedName: NAME,
        nameservers: [NS],
        negativeTtlSeconds: null,
      }),
      status: 'pending',
      verifiedAt: null,
    });
    expect(stoppedAt(stepsFor(o))?.key).toBe('record');
  });
});
