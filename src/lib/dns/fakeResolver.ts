// src/lib/dns/fakeResolver.ts
import type { DnsResolver, ResolverOutcome } from '@/lib/dns/types';

/**
 * A scripted resolver. Used by the unit tests, and shipped as the `.test` namespace so every
 * failure state is reachable in the deployed app without a real broken domain.
 */

export type ScriptedAnswer =
  | { kind: 'records'; records: string[] }
  | { kind: 'empty' }
  | { kind: 'name_not_found' }
  | { kind: 'refused' }
  /** Never settles. The deadline in trace.ts is what turns this into a timeout. */
  | { kind: 'hangs' };

export type DnsScript = {
  /** The name that answers with NS records. null means the walk finds nothing anywhere. */
  zone: string | null;
  nameservers: string[];
  /** Address per nameserver hostname. Defaults to a synthetic one per name. */
  addresses?: Record<string, string[]>;
  /** What each nameserver does when asked for TXT. A nameserver missing here answers empty. */
  servers: Record<string, ScriptedAnswer>;
  /** Milliseconds each nameserver waits before answering. Exercises the early return. */
  delaysMs?: Record<string, number>;
  soaMinTtlSeconds?: number;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createFakeResolver = (script: DnsScript): DnsResolver => {
  // Derived from position, so two nameservers never share an address. Names in a script tend to be
  // the same length, which is exactly what a length-based address would collide on.
  const addressOf = (nameserver: string) => {
    const explicit = script.addresses?.[nameserver];
    if (explicit !== undefined) {
      return explicit;
    }
    const index = script.nameservers.indexOf(nameserver);
    return [`198.51.100.${index >= 0 ? index + 1 : 254}`];
  };

  const nameserverAt = (address: string) =>
    script.nameservers.find((ns) => addressOf(ns).includes(address)) ?? null;

  const answered = <T>(value: T, elapsedMs = 1): ResolverOutcome<T> => ({
    ok: true,
    value,
    elapsedMs,
  });

  return {
    async resolveNs(name) {
      if (script.zone !== null && name === script.zone) {
        return answered(script.nameservers);
      }
      // A name that exists without being a zone apex gives ENODATA, which is what the real walk
      // sees on the way up. Measured 2026-09-12.
      return { ok: false, reason: { code: 'no_data' }, elapsedMs: 1 };
    },

    async resolveAddresses(hostname) {
      const addresses = addressOf(hostname);
      if (addresses.length === 0) {
        return { ok: false, reason: { code: 'name_not_found' }, elapsedMs: 1 };
      }
      return answered(addresses);
    },

    async resolveTxt(server, _name) {
      const nameserver = nameserverAt(server);
      const behaviour: ScriptedAnswer =
        nameserver === null ? { kind: 'empty' } : (script.servers[nameserver] ?? { kind: 'empty' });
      const delay = nameserver === null ? 0 : (script.delaysMs?.[nameserver] ?? 0);

      if (behaviour.kind === 'hangs') {
        // Long enough that the deadline always wins, short enough to never hold a test open.
        await wait(60_000);
      }
      if (delay > 0) {
        await wait(delay);
      }

      switch (behaviour.kind) {
        case 'records':
          return answered(behaviour.records, delay);
        case 'empty':
          return { ok: false, reason: { code: 'no_data' }, elapsedMs: delay };
        case 'name_not_found':
          return { ok: false, reason: { code: 'name_not_found' }, elapsedMs: delay };
        case 'refused':
          return { ok: false, reason: { code: 'refused' }, elapsedMs: delay };
        default:
          return { ok: false, reason: { code: 'no_data' }, elapsedMs: delay };
      }
    },

    async resolveSoaMinTtl(server, _zone) {
      // The SOA goes to the same servers as everything else, so a server that hangs hangs for this
      // too. Answering anyway would let a trace report a cache window it could not have read.
      const nameserver = nameserverAt(server);
      if (nameserver !== null && script.servers[nameserver]?.kind === 'hangs') {
        await wait(60_000);
      }
      if (script.soaMinTtlSeconds === undefined) {
        return { ok: false, reason: { code: 'no_data' }, elapsedMs: 1 };
      }
      return answered(script.soaMinTtlSeconds);
    },
  };
};
