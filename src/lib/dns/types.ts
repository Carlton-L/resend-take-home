// src/lib/dns/types.ts

/**
 * Why a single DNS question did not produce an answer.
 *
 * Modelled as a value rather than a thrown error. Every one of these is something the timeline
 * renders with a message and a next action, so they are results the product reports rather than
 * exceptions it recovers from. Collecting per-server outcomes into an array also stays natural.
 */
export type ResolverFailure =
  | { code: 'name_not_found' }
  | { code: 'no_data' }
  | { code: 'timed_out'; timeoutMs: number }
  | { code: 'refused' }
  /** We declined to send the query, because the zone pointed us at an address we will not probe. */
  | { code: 'address_not_public'; address: string }
  | { code: 'unknown'; detail: string };

export type ResolverOutcome<T> =
  | { ok: true; value: T; elapsedMs: number }
  | { ok: false; reason: ResolverFailure; elapsedMs: number };

/**
 * The only surface that talks to DNS. Node and the fake both implement it, so everything above
 * this line is testable without a network.
 *
 * Each method asks one question. The walking, the fan-out and the deadline live in the caller.
 */
export type DnsResolver = {
  /** NS records at exactly this name. `no_data` means the name exists and is not a zone apex. */
  resolveNs(name: string): Promise<ResolverOutcome<string[]>>;
  /** Addresses for a nameserver hostname. */
  resolveAddresses(hostname: string): Promise<ResolverOutcome<string[]>>;
  /** TXT at a name, asked of one specific server. Chunks are joined before they get here. */
  resolveTxt(server: string, name: string): Promise<ResolverOutcome<string[]>>;
  /** SOA minimum TTL at the zone apex, which is the negative cache window in seconds. */
  resolveSoaMinTtl(server: string, zone: string): Promise<ResolverOutcome<number>>;
};

/** One level tried on the way up while looking for the zone. */
export type ZoneWalkStep = {
  name: string;
  outcome: ResolverOutcome<string[]>;
};

/**
 * What one authoritative server did.
 *
 * `unfinished` is the honest state for a server still running when another one gave us the answer.
 * It has no elapsed time because it never finished.
 */
export type ServerResult =
  | { status: 'answered'; records: string[]; elapsedMs: number }
  | { status: 'failed'; reason: ResolverFailure; elapsedMs: number }
  | { status: 'unfinished' };

export type ServerQuery = {
  nameserver: string;
  address: string;
  result: ServerResult;
};

/** Turning a nameserver hostname into an address. Its own step, so the timing adds up. */
export type AddressLookup = {
  nameserver: string;
  outcome: ResolverOutcome<string[]>;
};

/**
 * What DNS holds at the queried name. Deliberately says nothing about tokens or verification;
 * comparing a value against a claim happens above this layer, so the trace stays reusable as a
 * diagnostic on its own.
 */
export type TraceOutcome =
  | { status: 'records_found'; records: string[]; answeredBy: string }
  | { status: 'no_records' }
  | { status: 'name_not_found' }
  | { status: 'nameservers_unreachable'; attempted: string[]; timeoutMs: number }
  | { status: 'zone_not_found'; walked: string[] };

export type Trace = {
  /** The name asked about. */
  queriedName: string;
  /** Each level tried, in the order tried. */
  zoneWalk: ZoneWalkStep[];
  /** The name that answered with NS records, or null when none did. */
  zone: string | null;
  nameservers: string[];
  addressLookups: AddressLookup[];
  /** Only the servers actually queried. One that did not resolve is in `addressLookups`. */
  servers: ServerQuery[];
  /** Read only when nothing was found, because that is the only time it tells the user anything. */
  negativeTtlSeconds: number | null;
  outcome: TraceOutcome;
  totalMs: number;
};
