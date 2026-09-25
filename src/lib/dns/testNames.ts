// src/lib/dns/testNames.ts
import 'server-only';
import type { ClaimStatus } from '@/lib/claims/state';
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

/** Stands in when a script is read without a claim to check, which is what the unit tests do. */
const PLACEHOLDER_RECORD =
  'domainclaim-token=DEMOTOKENDEMOTOKENDEMOTOKENDE expiry=2099-01-01T00:00:00Z';

/** A real domainclaim record carrying a token that belongs to nothing. Drives `value_mismatch`. */
const OTHER_RECORD =
  'domainclaim-token=AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH expiry=2099-01-01T00:00:00Z';

/**
 * Only the outcomes reachable so far. `token_expired` is decided from the claim row, so
 * `expired.test` gets its expiry at creation instead (`demoTokenLifetimeMs`). `cname_at_name` and
 * `dnssec_broken` need the DoH leg and arrive with it.
 *
 * `other-txt.test` renders the same as `record-not-found.test`, and that is its point: TXT records
 * for other services at the name, which is what a wildcard zone like apple.com answers, once showed
 * as a wrong token.
 *
 * `status` is the claim's status before this check. Only `flaky.test` reads it.
 */
const scripts = (expected: string, status: ClaimStatus): Record<string, DnsScript> => ({
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

  /**
   * NODATA at our name and NXDOMAIN everywhere else. Without the second half this zone answers for
   * every name, the wildcard probe reads it as a wildcard, and the check correctly reports that the
   * record is simply not there.
   */
  'no-txt-at-name.test': {
    zone: 'no-txt-at-name.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'name_not_found' },
      'ns2.example-dns.test': { kind: 'name_not_found' },
      'ns3.example-dns.test': { kind: 'name_not_found' },
    },
    byName: {
      '_domainclaim-challenge.no-txt-at-name.test': { kind: 'empty' },
    },
    soaMinTtlSeconds: 7200,
  },

  /** The record one level down, because the panel put the domain on the end of the Name field. */
  'appended-zone.test': {
    zone: 'appended-zone.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'name_not_found' },
      'ns2.example-dns.test': { kind: 'name_not_found' },
      'ns3.example-dns.test': { kind: 'name_not_found' },
    },
    byName: {
      '_domainclaim-challenge.appended-zone.test.appended-zone.test': {
        kind: 'records',
        records: [expected],
      },
    },
    soaMinTtlSeconds: 300,
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

  /**
   * Another service's TXT record at the name and none of ours, the way a wildcard answers every
   * name in a zone (`*.apple.com` does this with its SPF record). Our record isn't there yet.
   */
  'other-txt.test': {
    zone: 'other-txt.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: ['v=spf1 redirect=_spf.example.com'] },
      'ns2.example-dns.test': { kind: 'records', records: ['v=spf1 redirect=_spf.example.com'] },
      'ns3.example-dns.test': { kind: 'records', records: ['v=spf1 redirect=_spf.example.com'] },
    },
    soaMinTtlSeconds: 300,
  },

  /**
   * The record comes and goes, one flip per check, so every held state is one press of Check now
   * away: a pending claim finds it and verifies, a verified claim loses it and goes at risk, and an
   * at-risk claim finds it again and recovers.
   */
  'flaky.test': {
    zone: 'flaky.test',
    nameservers: DEMO_NAMESERVERS,
    servers:
      status === 'verified'
        ? {
            'ns1.example-dns.test': { kind: 'name_not_found' },
            'ns2.example-dns.test': { kind: 'name_not_found' },
            'ns3.example-dns.test': { kind: 'name_not_found' },
          }
        : {
            'ns1.example-dns.test': { kind: 'records', records: [expected] },
            'ns2.example-dns.test': { kind: 'records', records: [expected] },
            'ns3.example-dns.test': { kind: 'records', records: [expected] },
          },
    soaMinTtlSeconds: 300,
  },

  /** Answers like `verified.test`. Its token has already run out, so no answer can prove it. */
  'expired.test': {
    zone: 'expired.test',
    nameservers: DEMO_NAMESERVERS,
    servers: {
      'ns1.example-dns.test': { kind: 'records', records: [expected] },
      'ns2.example-dns.test': { kind: 'records', records: [expected] },
      'ns3.example-dns.test': { kind: 'records', records: [expected] },
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

export const testNames = (): string[] => Object.keys(scripts(PLACEHOLDER_RECORD, 'pending'));

/**
 * How long a new demo claim's token lives, when it isn't the usual seven days. `expired.test` is
 * created a minute past its expiry, so the expired state is one name away rather than a week.
 */
export const demoTokenLifetimeMs = (name: string): number | null =>
  name === 'expired.test' ? -60_000 : null;

/**
 * The script for a name, or null when the name is under `.test` but is not one we scripted.
 *
 * `expectedRecord` is the record value the caller is looking for, which is what the scripts that
 * succeed return. Without it a demo claim could never verify: the script would answer with a fixed
 * token and every check on `verified.test` would report `value_mismatch`.
 */
export const scriptFor = (
  name: string,
  expectedRecord?: string,
  status: ClaimStatus = 'pending',
): DnsScript | null => scripts(expectedRecord ?? PLACEHOLDER_RECORD, status)[name] ?? null;
