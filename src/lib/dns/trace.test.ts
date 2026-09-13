// src/lib/dns/trace.test.ts
import { describe, expect, it } from 'vitest';
import type { DnsScript } from '@/lib/dns/fakeResolver';
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { outcomeFrom, traceName } from '@/lib/dns/trace';
import type { DnsResolver, ServerQuery } from '@/lib/dns/types';
import { normalizeDomainInput } from '@/lib/domain/normalize';

/** Short so a hanging server costs the suite milliseconds instead of seconds. */
const TIMEOUT_MS = 40;

const RECORD = 'domainclaim-token=ABC expiry=2099-01-01';

const run = (script: DnsScript, name: string) =>
  traceName(createFakeResolver(script), name, { timeoutMs: TIMEOUT_MS });

const zone = (servers: DnsScript['servers'], extra: Partial<DnsScript> = {}): DnsScript => ({
  zone: 'example.com',
  nameservers: ['ns1.example.com', 'ns2.example.com', 'ns3.example.com'],
  servers,
  soaMinTtlSeconds: 300,
  ...extra,
});

describe('traceName, the zone walk', () => {
  it('walks up from the full name and stops at the first level with nameservers', async () => {
    const trace = await run(
      zone({ 'ns1.example.com': { kind: 'records', records: [RECORD] } }),
      '_domainclaim-challenge.example.com',
    );
    expect(trace.zoneWalk.map((step) => step.name)).toEqual([
      '_domainclaim-challenge.example.com',
      'example.com',
    ]);
    expect(trace.zone).toBe('example.com');
  });

  it('asks one level only when the name is already the apex', async () => {
    const trace = await run(zone({ 'ns1.example.com': { kind: 'empty' } }), 'example.com');
    expect(trace.zoneWalk).toHaveLength(1);
  });

  it('reports zone_not_found with everything it tried when no level answers', async () => {
    const trace = await run({ zone: null, nameservers: [], servers: {} }, 'deep.sub.example.com');
    expect(trace.outcome).toEqual({
      status: 'zone_not_found',
      walked: ['deep.sub.example.com', 'sub.example.com', 'example.com'],
    });
    expect(trace.zone).toBeNull();
  });
});

describe('traceName, the parallel query', () => {
  it('finds the records and names the server that answered', async () => {
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'empty' },
        'ns2.example.com': { kind: 'records', records: [RECORD] },
        'ns3.example.com': { kind: 'empty' },
      }),
      'example.com',
    );
    expect(trace.outcome).toEqual({
      status: 'records_found',
      records: [RECORD],
      answeredBy: 'ns2.example.com',
    });
  });

  it('answers at the speed of the fast servers when one is dead', async () => {
    const started = Date.now();
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'records', records: [RECORD] },
        'ns2.example.com': { kind: 'hangs' },
        'ns3.example.com': { kind: 'records', records: [RECORD] },
      }),
      'example.com',
    );
    // The whole point of returning when the answer is known. Waiting for ns2 would cost the
    // deadline on a check that succeeded immediately.
    expect(Date.now() - started).toBeLessThan(TIMEOUT_MS);
    expect(trace.outcome.status).toBe('records_found');
  });

  it('marks a server still running when the answer arrived, rather than dropping it', async () => {
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'records', records: [RECORD] },
        'ns2.example.com': { kind: 'hangs' },
        'ns3.example.com': { kind: 'hangs' },
      }),
      'example.com',
    );
    const unfinished = trace.servers.filter((server) => server.result.status === 'unfinished');
    expect(unfinished).toHaveLength(2);
    expect(trace.servers).toHaveLength(3);
  });

  it('waits for every server before reporting a miss', async () => {
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'empty' },
        'ns2.example.com': { kind: 'empty' },
        'ns3.example.com': { kind: 'empty' },
      }),
      'example.com',
    );
    expect(trace.outcome.status).toBe('no_records');
    expect(trace.servers.every((server) => server.result.status !== 'unfinished')).toBe(true);
  });

  it('reports nameservers_unreachable with the deadline it used', async () => {
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'hangs' },
        'ns2.example.com': { kind: 'hangs' },
        'ns3.example.com': { kind: 'hangs' },
      }),
      'example.com',
    );
    expect(trace.outcome).toEqual({
      status: 'nameservers_unreachable',
      attempted: ['ns1.example.com', 'ns2.example.com', 'ns3.example.com'],
      timeoutMs: TIMEOUT_MS,
    });
  });

  it('separates a missing name from a name with no TXT', async () => {
    const missing = await run(
      zone({
        'ns1.example.com': { kind: 'name_not_found' },
        'ns2.example.com': { kind: 'name_not_found' },
        'ns3.example.com': { kind: 'name_not_found' },
      }),
      'example.com',
    );
    expect(missing.outcome.status).toBe('name_not_found');
  });

  it('takes the positive answer when servers disagree, and shows the disagreement', async () => {
    // Two servers in one zone can genuinely differ while a change is still spreading between them.
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'name_not_found' },
        'ns2.example.com': { kind: 'records', records: [RECORD] },
        'ns3.example.com': { kind: 'name_not_found' },
      }),
      'example.com',
    );
    expect(trace.outcome.status).toBe('records_found');
    expect(trace.servers.filter((server) => server.result.status === 'failed')).not.toHaveLength(0);
  });
});

describe('traceName, the negative cache window', () => {
  it('reads the SOA minimum only when nothing was found', async () => {
    const miss = await run(
      zone({
        'ns1.example.com': { kind: 'name_not_found' },
        'ns2.example.com': { kind: 'name_not_found' },
        'ns3.example.com': { kind: 'name_not_found' },
      }),
      'example.com',
    );
    expect(miss.negativeTtlSeconds).toBe(300);

    const hit = await run(
      zone({ 'ns1.example.com': { kind: 'records', records: [RECORD] } }),
      'example.com',
    );
    expect(hit.negativeTtlSeconds).toBeNull();
  });

  it('does not report a window it could not have read', async () => {
    // Every nameserver is unreachable, so the SOA query would go to those same servers. Answering
    // anyway would put a number in the trace that was never asked for.
    const trace = await run(
      zone({
        'ns1.example.com': { kind: 'hangs' },
        'ns2.example.com': { kind: 'hangs' },
        'ns3.example.com': { kind: 'hangs' },
      }),
      'example.com',
    );
    expect(trace.outcome.status).toBe('nameservers_unreachable');
    expect(trace.negativeTtlSeconds).toBeNull();
  });
});

describe('traceName, nameservers that do not resolve', () => {
  it('records the address lookup as its own step, so the timing adds up', async () => {
    const trace = await run(
      zone({ 'ns1.example.com': { kind: 'records', records: [RECORD] } }),
      'example.com',
    );
    expect(trace.addressLookups.map((lookup) => lookup.nameserver)).toEqual([
      'ns1.example.com',
      'ns2.example.com',
      'ns3.example.com',
    ]);
  });

  it('keeps a nameserver that will not resolve, rather than shortening the list silently', async () => {
    const script = zone(
      { 'ns1.example.com': { kind: 'records', records: [RECORD] } },
      { addresses: { 'ns1.example.com': ['192.0.2.10'], 'ns2.example.com': [] } },
    );
    const trace = await run(script, 'example.com');

    const failed = trace.addressLookups.find((lookup) => !lookup.outcome.ok);
    expect(failed?.nameserver).toBe('ns2.example.com');
    // It was never queried, so it does not appear as a server. The step above is where it shows.
    expect(trace.servers.map((server) => server.nameserver)).not.toContain('ns2.example.com');
  });
});

describe('traceName, delegated subdomains', () => {
  it('stops at the child zone instead of walking past it to the parent', async () => {
    // The reason the walk exists. app.example.com can hold its own nameservers, and the parent's
    // would be the wrong ones to ask.
    const script: DnsScript = {
      zone: 'app.example.com',
      nameservers: ['ns1.app.example.com'],
      servers: { 'ns1.app.example.com': { kind: 'records', records: [RECORD] } },
      soaMinTtlSeconds: 60,
    };
    const trace = await run(script, '_domainclaim-challenge.app.example.com');

    expect(trace.zone).toBe('app.example.com');
    expect(trace.zoneWalk.map((step) => step.name)).toEqual([
      '_domainclaim-challenge.app.example.com',
      'app.example.com',
    ]);
    expect(trace.zoneWalk.map((step) => step.name)).not.toContain('example.com');
  });

  it('handles a zone with a single nameserver', async () => {
    const script: DnsScript = {
      zone: 'example.com',
      nameservers: ['ns1.example.com'],
      servers: { 'ns1.example.com': { kind: 'records', records: [RECORD] } },
    };
    const trace = await run(script, 'example.com');
    expect(trace.servers).toHaveLength(1);
    expect(trace.outcome.status).toBe('records_found');
  });
});

describe('traceName, punycode', () => {
  it('traces the ASCII form that normalization produces', async () => {
    const normalized = normalizeDomainInput('münchen.de');
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const script: DnsScript = {
      zone: 'xn--mnchen-3ya.de',
      nameservers: ['ns1.example.com'],
      servers: { 'ns1.example.com': { kind: 'records', records: [RECORD] } },
    };
    const trace = await run(script, normalized.value.name);

    expect(trace.queriedName).toBe('xn--mnchen-3ya.de');
    expect(trace.outcome.status).toBe('records_found');
  });
});

describe('outcomeFrom, the classification rule', () => {
  const answered = (nameserver: string, elapsedMs: number, records = [RECORD]): ServerQuery => ({
    nameserver,
    address: '192.0.2.1',
    result: { status: 'answered', records, elapsedMs },
  });

  const failed = (nameserver: string, reason: ServerQuery['result']): ServerQuery => ({
    nameserver,
    address: '192.0.2.1',
    result: reason,
  });

  const NAMES = ['ns1', 'ns2', 'ns3'];

  it('names the fastest server that had records, not the first in the list', () => {
    const outcome = outcomeFrom([answered('ns1', 120), answered('ns2', 92)], NAMES, 2000);
    expect(outcome).toEqual({ status: 'records_found', records: [RECORD], answeredBy: 'ns2' });
  });

  it('ignores a server that answered with no records', () => {
    const outcome = outcomeFrom([answered('ns1', 5, []), answered('ns2', 90)], NAMES, 2000);
    expect(outcome.status).toBe('records_found');
    if (outcome.status === 'records_found') {
      expect(outcome.answeredBy).toBe('ns2');
    }
  });

  it('calls it unreachable when nothing got through, whether by timeout or by refusal to send', () => {
    const timedOut = outcomeFrom(
      NAMES.map((name) =>
        failed(name, {
          status: 'failed',
          reason: { code: 'timed_out', timeoutMs: 2000 },
          elapsedMs: 2000,
        }),
      ),
      NAMES,
      2000,
    );
    expect(timedOut.status).toBe('nameservers_unreachable');

    // A zone pointing at addresses we decline to query is the same situation from the user's side:
    // we never got an answer from those nameservers.
    const blocked = outcomeFrom(
      NAMES.map((name) =>
        failed(name, {
          status: 'failed',
          reason: { code: 'address_not_public', address: '10.0.0.1' },
          elapsedMs: 0,
        }),
      ),
      NAMES,
      2000,
    );
    expect(blocked.status).toBe('nameservers_unreachable');
  });

  it('separates a name that does not exist from a name with no TXT', () => {
    const missing = outcomeFrom(
      [failed('ns1', { status: 'failed', reason: { code: 'name_not_found' }, elapsedMs: 5 })],
      NAMES,
      2000,
    );
    expect(missing.status).toBe('name_not_found');

    const empty = outcomeFrom(
      [failed('ns1', { status: 'failed', reason: { code: 'no_data' }, elapsedMs: 5 })],
      NAMES,
      2000,
    );
    expect(empty.status).toBe('no_records');
  });

  it('does not let an unfinished server decide anything', () => {
    const outcome = outcomeFrom(
      [
        { nameserver: 'ns1', address: '192.0.2.1', result: { status: 'unfinished' } },
        failed('ns2', { status: 'failed', reason: { code: 'no_data' }, elapsedMs: 5 }),
      ],
      NAMES,
      2000,
    );
    expect(outcome.status).toBe('no_records');
  });

  it('reports every nameserver as attempted, including ones that never resolved', () => {
    const outcome = outcomeFrom([], NAMES, 2000);
    expect(outcome).toEqual({
      status: 'nameservers_unreachable',
      attempted: NAMES,
      timeoutMs: 2000,
    });
  });
});

describe('traceName, a resolver that misbehaves', () => {
  it('reports a thrown error as unknown rather than blaming the nameservers', async () => {
    // A resolver is not supposed to throw. If ours does, calling it a timeout would tell the user
    // their DNS is unreachable and send them to fix something that is not broken.
    const throwing: DnsResolver = {
      resolveNs: async () => ({ ok: true, value: ['ns1.example.com'], elapsedMs: 1 }),
      resolveAddresses: async () => ({ ok: true, value: ['192.0.2.1'], elapsedMs: 1 }),
      resolveTxt: async () => {
        throw new Error('bug in the resolver');
      },
      resolveSoaMinTtl: async () => ({ ok: true, value: 300, elapsedMs: 1 }),
    };

    const trace = await traceName(throwing, 'example.com', { timeoutMs: TIMEOUT_MS });
    const [server] = trace.servers;
    expect(server?.result.status).toBe('failed');
    if (server?.result.status === 'failed') {
      expect(server.result.reason.code).toBe('unknown');
    }
    expect(trace.outcome.status).not.toBe('nameservers_unreachable');
  });
});
