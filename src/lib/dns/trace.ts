// src/lib/dns/trace.ts
import type {
  AddressLookup,
  DnsResolver,
  ResolverFailure,
  ResolverOutcome,
  ServerQuery,
  ServerResult,
  Trace,
  TraceOutcome,
  ZoneWalkStep,
} from '@/lib/dns/types';

export type TraceOptions = {
  /** How long any one DNS question gets before we stop waiting for it. */
  timeoutMs: number;
};

/**
 * 2s, against a measured healthy authoritative answer of 92ms.
 *
 * The number mostly decides how long one dead nameserver can tax a zone that works, since every
 * server is asked at once and one answer is enough. It is only the whole answer when every server
 * misses. Reported in the trace rather than hidden, so a wrong call is visible.
 *
 * It applies to every question, not only the TXT one, so the worst case for a whole trace is this
 * multiplied by the number of steps: the walk levels, one address round, one TXT round, and the SOA
 * read when there is one.
 */
export const DEFAULT_TIMEOUT_MS = 2000;

/**
 * The name and every parent down to two labels, in the order to try them.
 *
 * Walking up is what makes a delegated subdomain work: `app.example.com` can be a zone of its own,
 * and asking its parent first would find the wrong nameservers.
 */
const namesToWalk = (name: string): string[] => {
  const labels = name.split('.');
  const names: string[] = [];
  for (let i = 0; i + 2 <= labels.length; i += 1) {
    names.push(labels.slice(i).join('.'));
  }
  return names;
};

const TIMED_OUT = Symbol('timed out');

const withDeadline = <T>(work: Promise<T>, timeoutMs: number): Promise<T | typeof TIMED_OUT> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/** Failures we never got an answer through, as opposed to an answer we did not like. */
const UNREACHABLE: ReadonlySet<ResolverFailure['code']> = new Set([
  'timed_out',
  'address_not_public',
]);

/**
 * Whether the server on the other end said anything at all.
 *
 * NXDOMAIN and an empty answer are answers: the server was reached and had nothing to give. Only a
 * deadline passing, or an address we declined to probe, means we never got to ask. Exported because
 * the step list needs exactly this distinction and must not keep a second copy of it.
 */
export const serverResponded = (result: ServerResult): boolean =>
  result.status === 'answered' ||
  (result.status === 'failed' && !UNREACHABLE.has(result.reason.code));

/**
 * Every question goes through here, so nothing can outlast the deadline. A resolver's own timeout
 * is a backstop for the socket; this is the one that decides.
 *
 * Takes a thunk so a synchronous throw is caught too. A resolver is not supposed to throw at all,
 * and reporting a bug in ours as a timeout would blame the user's nameservers for it.
 */
const ask = async <T>(
  work: () => Promise<ResolverOutcome<T>>,
  timeoutMs: number,
): Promise<ResolverOutcome<T>> => {
  const started = performance.now();
  const since = () => Math.round(performance.now() - started);
  try {
    const outcome = await withDeadline(work(), timeoutMs);
    if (outcome === TIMED_OUT) {
      return { ok: false, reason: { code: 'timed_out', timeoutMs }, elapsedMs: since() };
    }
    return outcome;
  } catch (error) {
    return { ok: false, reason: { code: 'unknown', detail: String(error) }, elapsedMs: since() };
  }
};

const toServerResult = (outcome: ResolverOutcome<string[]>): ServerResult =>
  outcome.ok
    ? { status: 'answered', records: outcome.value, elapsedMs: outcome.elapsedMs }
    : { status: 'failed', reason: outcome.reason, elapsedMs: outcome.elapsedMs };

/**
 * Ask every server at once and return as soon as one of them has records.
 *
 * A server still running at that point is reported as `unfinished`, which is true and is cheaper
 * than making every successful check wait out a dead nameserver. Failure has no early exit, because
 * until the last server has missed there is no answer to give.
 */
const queryServers = async (
  resolver: DnsResolver,
  targets: { nameserver: string; address: string }[],
  name: string,
  timeoutMs: number,
): Promise<ServerQuery[]> => {
  const results: (ServerResult | null)[] = targets.map(() => null);
  let foundRecords: () => void = () => {};
  const firstRecords = new Promise<void>((resolve) => {
    foundRecords = resolve;
  });

  const everyServer = targets.map(async (target, index) => {
    const result = toServerResult(
      await ask(() => resolver.resolveTxt(target.address, name), timeoutMs),
    );
    results[index] = result;
    if (result.status === 'answered' && result.records.length > 0) {
      foundRecords();
    }
  });

  await Promise.race([firstRecords, Promise.all(everyServer)]);

  return targets.map((target, index) => ({
    nameserver: target.nameserver,
    address: target.address,
    result: results[index] ?? { status: 'unfinished' },
  }));
};

/**
 * What the servers collectively said. Exported because it is the classification rule rather than a
 * helper, and because reaching every branch of it through timing would be a flaky test.
 */
export const outcomeFrom = (
  servers: ServerQuery[],
  nameservers: string[],
  timeoutMs: number,
): TraceOutcome => {
  // Fastest rather than first in the NS list, so the name in the outcome matches the timing beside
  // it. Others may also hold the record; the per-server rows are where that shows.
  let fastest: { nameserver: string; records: string[]; elapsedMs: number } | null = null;
  for (const server of servers) {
    if (server.result.status !== 'answered' || server.result.records.length === 0) {
      continue;
    }
    if (fastest === null || server.result.elapsedMs < fastest.elapsedMs) {
      fastest = {
        nameserver: server.nameserver,
        records: server.result.records,
        elapsedMs: server.result.elapsedMs,
      };
    }
  }
  if (fastest !== null) {
    return { status: 'records_found', records: fastest.records, answeredBy: fastest.nameserver };
  }

  const finished = servers.filter((server) => server.result.status !== 'unfinished');

  const noneGotThrough =
    finished.length > 0 &&
    finished.every(
      (server) => server.result.status === 'failed' && UNREACHABLE.has(server.result.reason.code),
    );
  if (finished.length === 0 || noneGotThrough) {
    return { status: 'nameservers_unreachable', attempted: nameservers, timeoutMs };
  }

  const nameIsMissing = finished.some(
    (server) => server.result.status === 'failed' && server.result.reason.code === 'name_not_found',
  );
  return nameIsMissing ? { status: 'name_not_found' } : { status: 'no_records' };
};

/**
 * One question, one trace. Walks up to the zone, asks every authoritative server for TXT at the
 * name, and reports what each one did.
 *
 * Says nothing about tokens. Comparing a value against a claim happens above this layer, which is
 * what keeps the trace usable as a diagnostic on its own.
 */
export const traceName = async (
  resolver: DnsResolver,
  queriedName: string,
  options: TraceOptions = { timeoutMs: DEFAULT_TIMEOUT_MS },
): Promise<Trace> => {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const { timeoutMs } = options;

  // Sequential on purpose. Each level is only worth asking if the one below it was not the zone.
  const zoneWalk: ZoneWalkStep[] = [];
  let zone: string | null = null;
  let nameservers: string[] = [];

  for (const candidate of namesToWalk(queriedName)) {
    const outcome = await ask(() => resolver.resolveNs(candidate), timeoutMs);
    zoneWalk.push({ name: candidate, outcome });
    if (outcome.ok && outcome.value.length > 0) {
      zone = candidate;
      nameservers = outcome.value;
      break;
    }
  }

  if (zone === null) {
    return {
      queriedName,
      zoneWalk,
      zone: null,
      nameservers: [],
      addressLookups: [],
      servers: [],
      negativeTtlSeconds: null,
      outcome: { status: 'zone_not_found', walked: zoneWalk.map((step) => step.name) },
      totalMs: elapsed(),
    };
  }

  // In parallel: one nameserver whose address will not resolve should not delay the others.
  const addressLookups: AddressLookup[] = await Promise.all(
    nameservers.map(async (nameserver) => ({
      nameserver,
      outcome: await ask(() => resolver.resolveAddresses(nameserver), timeoutMs),
    })),
  );

  const targets: { nameserver: string; address: string }[] = [];
  for (const lookup of addressLookups) {
    if (lookup.outcome.ok) {
      for (const address of lookup.outcome.value) {
        targets.push({ nameserver: lookup.nameserver, address });
      }
    }
  }

  const servers =
    targets.length > 0 ? await queryServers(resolver, targets, queriedName, timeoutMs) : [];
  const outcome = outcomeFrom(servers, nameservers, timeoutMs);

  // Read on a miss, and only when something answered. When the record is there the countdown tells
  // the user nothing, and when every server is unreachable the SOA would go to those same servers.
  let negativeTtlSeconds: number | null = null;
  const shouldRead = outcome.status === 'no_records' || outcome.status === 'name_not_found';
  // Asked of a server that got back to us. The first target might be one that timed out, and this
  // query would then cost another full deadline to fail the same way.
  const responsive = servers.find(
    (server) =>
      server.result.status === 'answered' ||
      (server.result.status === 'failed' && !UNREACHABLE.has(server.result.reason.code)),
  );
  if (shouldRead && responsive !== undefined) {
    const soa = await ask(() => resolver.resolveSoaMinTtl(responsive.address, zone), timeoutMs);
    if (soa.ok) {
      negativeTtlSeconds = soa.value;
    }
  }

  return {
    queriedName,
    zoneWalk,
    zone,
    nameservers,
    addressLookups,
    servers,
    negativeTtlSeconds,
    outcome,
    totalMs: elapsed(),
  };
};
