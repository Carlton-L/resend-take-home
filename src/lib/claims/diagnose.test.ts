// src/lib/claims/diagnose.test.ts
import { describe, expect, it } from 'vitest';
import { diagnose } from '@/lib/claims/diagnose';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import type { CheckResult } from '@/lib/claims/state';
import { createFakeResolver, type DnsScript } from '@/lib/dns/fakeResolver';
import { traceName } from '@/lib/dns/trace';

const ZONE = 'example.com';
const CLAIM = { name: ZONE, token: 'TOKENTOKENTOKENTOKENTOKENTOKEN12' };
const QUERIED = recordFullName(ZONE);
const DOUBLED = `${QUERIED}.${ZONE}`;
const EXPECTED = formatRecordValue(CLAIM.token, new Date('2026-09-21T00:00:00Z'));
const NS = ['ns1.example.com'];

const TIMEOUT_MS = 60;

const script = (over: Partial<DnsScript>): DnsScript => ({
  zone: ZONE,
  nameservers: NS,
  servers: { 'ns1.example.com': { kind: 'name_not_found' } },
  soaMinTtlSeconds: 300,
  ...over,
});

const run = async (s: DnsScript, result: CheckResult) => {
  const resolver = createFakeResolver(s);
  const trace = await traceName(resolver, QUERIED, { timeoutMs: TIMEOUT_MS });
  return diagnose(resolver, trace, CLAIM, result);
};

const notFound: CheckResult = {
  status: 'failed',
  reason: {
    code: 'record_not_found',
    queriedName: QUERIED,
    nameservers: NS,
    negativeTtlSeconds: 300,
  },
};

const noTxt: CheckResult = {
  status: 'failed',
  reason: { code: 'no_txt_at_name', queriedName: QUERIED },
};

describe('the appended zone probe', () => {
  it('names where the record actually is when the panel doubled the domain', async () => {
    const result = await run(
      script({ byName: { [DOUBLED]: { kind: 'records', records: [EXPECTED] } } }),
      notFound,
    );
    expect(result.status).toBe('failed');
    if (result.status !== 'failed') return;
    expect(result.reason.code).toBe('appended_zone_suspected');
    if (result.reason.code !== 'appended_zone_suspected') return;
    expect(result.reason.foundAt).toBe(DOUBLED);
  });

  // Someone else's TXT one level down says nothing about this claim.
  it('ignores a record at the doubled name that is not ours', async () => {
    const result = await run(
      script({ byName: { [DOUBLED]: { kind: 'records', records: ['v=spf1 ~all'] } } }),
      notFound,
    );
    expect(result.status === 'failed' && result.reason.code).toBe('record_not_found');
  });

  it('leaves the reading alone when nothing is down there either', async () => {
    const result = await run(script({}), notFound);
    expect(result.status === 'failed' && result.reason.code).toBe('record_not_found');
  });
});

describe('the wildcard probe', () => {
  // A zone that answers for names nobody created cannot tell us anything by answering for ours.
  it('reads a zone that answers for everything as a record not added yet', async () => {
    const result = await run(script({ servers: { 'ns1.example.com': { kind: 'empty' } } }), noTxt);
    expect(result.status === 'failed' && result.reason.code).toBe('record_not_found');
  });

  it('keeps the reading when a made up name is properly refused', async () => {
    const result = await run(script({ byName: { [QUERIED]: { kind: 'empty' } } }), noTxt);
    expect(result.status === 'failed' && result.reason.code).toBe('no_txt_at_name');
  });
});

describe('diagnose', () => {
  it('does nothing to a check that succeeded', async () => {
    const verified: CheckResult = { status: 'verified', record: EXPECTED, answeredBy: NS[0] ?? '' };
    expect(await run(script({}), verified)).toEqual(verified);
  });

  it('does nothing for a reason no probe can speak to', async () => {
    const expired: CheckResult = {
      status: 'failed',
      reason: { code: 'token_expired', expiredAt: new Date('2026-09-01T00:00:00Z') },
    };
    expect(await run(script({}), expired)).toEqual(expired);
  });

  it('does nothing without a trace, since an expired claim never asked DNS anything', async () => {
    expect(await diagnose(createFakeResolver(script({})), null, CLAIM, notFound)).toEqual(notFound);
  });
});
