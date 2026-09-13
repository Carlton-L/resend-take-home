// src/lib/dns/testNames.ts
import type { DnsScript } from '@/lib/dns/fakeResolver';

/**
 * The demo namespace.
 *
 * Every name here routes to the fake resolver, so a reviewer reaches each outcome by typing a name
 * rather than by finding a switch. `.test` is reserved by RFC 6761 and can never be a real claim,
 * which is what makes the fake unreachable for any name that could be.
 *
 * Enabled per deployment. Off, `.test` stays refused as a special-use name.
 */
export const testNamespaceEnabled = (): boolean => process.env.DOMAINCLAIM_TEST_NAMESPACE === 'on';

export const isTestName = (name: string): boolean => name.split('.').pop() === 'test';

const DEMO_NAMESERVERS = ['ns1.example-dns.test', 'ns2.example-dns.test', 'ns3.example-dns.test'];

/** Stands in when no claim is being checked, for example a bare `/api/trace` call. */
const PLACEHOLDER_RECORD =
  'domainclaim-token=DEMOTOKENDEMOTOKENDEMOTOKENDE expiry=2099-01-01T00:00:00Z';

/** A real domainclaim record carrying a token that belongs to nothing. Drives `value_mismatch`. */
const OTHER_RECORD =
  'domainclaim-token=AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH expiry=2099-01-01T00:00:00Z';

/**
 * Only the outcomes reachable so far. `token_expired` is decided from the claim row rather than
 * from DNS, so no name can produce it. `cname_at_name`, `dnssec_broken` and
 * `appended_zone_suspected` need the DoH leg and arrive with it.
 */
const scripts = (expected: string): Record<string, DnsScript> => ({
  'verified.test': {
    zone: 'verified.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [expected] },
      'ns2.example-dns.test': { kind: 'records', records: [expected] },
      'ns3.example-dns.test': { kind: 'records', records: [expected] },
    },
    soaMinTtlSeconds: 300,
  },

  'record-not-found.test': {
    zone: 'record-not-found.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'name_not_found' },
      'ns2.example-dns.test': { kind: 'name_not_found' },
      'ns3.example-dns.test': { kind: 'name_not_found' },
    },
    soaMinTtlSeconds: 300,
  },

  'no-txt-at-name.test': {
    zone: 'no-txt-at-name.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'empty' },
      'ns2.example-dns.test': { kind: 'empty' },
      'ns3.example-dns.test': { kind: 'empty' },
    },
    soaMinTtlSeconds: 7200,
  },

  'nameservers-unreachable.test': {
    zone: 'nameservers-unreachable.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'hangs' },
      'ns2.example-dns.test': { kind: 'hangs' },
      'ns3.example-dns.test': { kind: 'hangs' },
    },
  },

  'zone-not-found.test': {
    zone: null,
    nameservers: [],
    servers: {},
  },

  /** One dead server in a zone that works. The check still answers at the speed of the fast ones. */
  'one-dead-nameserver.test': {
    zone: 'one-dead-nameserver.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [expected] },
      'ns2.example-dns.test': { kind: 'hangs' },
      'ns3.example-dns.test': { kind: 'records', records: [expected] },
    },
    soaMinTtlSeconds: 300,
  },

  /** Our record sitting beside other services' records at the same name. */
  'crowded-name.test': {
    zone: 'crowded-name.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': {
        kind: 'records',
        records: ['v=spf1 include:example.com ~all', expected, 'google-site-verification=abc123'],
      },
      'ns2.example-dns.test': { kind: 'records', records: [expected] },
      'ns3.example-dns.test': { kind: 'records', records: [expected] },
    },
    soaMinTtlSeconds: 300,
  },

  /** A TXT record of ours at the name, carrying a token this claim did not issue. */
  'value-mismatch.test': {
    zone: 'value-mismatch.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [OTHER_RECORD] },
      'ns2.example-dns.test': { kind: 'records', records: [OTHER_RECORD] },
      'ns3.example-dns.test': { kind: 'records', records: [OTHER_RECORD] },
    },
    soaMinTtlSeconds: 300,
  },

  /** Alive but past the deadline. The case that argues against the shorter timeout. */
  'slow-nameservers.test': {
    zone: 'slow-nameservers.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [expected] },
      'ns2.example-dns.test': { kind: 'records', records: [expected] },
      'ns3.example-dns.test': { kind: 'records', records: [expected] },
    },
    delaysMs: {
      'ns1.example-dns.test': 2500,
      'ns2.example-dns.test': 2600,
      'ns3.example-dns.test': 2700,
    },
    soaMinTtlSeconds: 300,
  },
});

export const testNames = (): string[] => Object.keys(scripts(PLACEHOLDER_RECORD));

/**
 * The script for a name, or null when the name is under `.test` but is not one we scripted.
 *
 * `expectedRecord` is the record value the caller is looking for, which is what the scripts that
 * succeed return. Without it a demo claim could never verify: the script would answer with a fixed
 * token and every check on `verified.test` would report `value_mismatch`.
 */
export const scriptFor = (name: string, expectedRecord?: string): DnsScript | null =>
  scripts(expectedRecord ?? PLACEHOLDER_RECORD)[name] ?? null;
