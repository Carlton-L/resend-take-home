// src/lib/dns/nodeResolver.ts
import { Resolver } from 'node:dns/promises';
import { isQueryableAddress } from '@/lib/dns/address';
import { joinRecords } from '@/lib/dns/txt';
import type { DnsResolver, ResolverFailure, ResolverOutcome } from '@/lib/dns/types';

/**
 * Node runtime only. Opens UDP/53 to authoritative nameservers, which a Vercel Node function was
 * measured doing in 92ms on 2026-09-12. Never import this from anything that could run on Edge.
 */

/** c-ares error codes, mapped to the reasons the product reports. */
const toFailure = (error: unknown): ResolverFailure => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  switch (code) {
    case 'ENOTFOUND':
    case 'NXDOMAIN':
      return { code: 'name_not_found' };
    case 'ENODATA':
      return { code: 'no_data' };
    case 'ETIMEOUT':
    case 'ETIMEDOUT':
      // The wrapper in trace.ts usually wins the race, so this is the backstop firing.
      return { code: 'timed_out', timeoutMs: -1 };
    case 'REFUSED':
      return { code: 'refused' };
    default:
      return { code: 'unknown', detail: String(code ?? error) };
  }
};

const timed = async <T>(work: () => Promise<T>): Promise<ResolverOutcome<T>> => {
  const started = performance.now();
  try {
    const value = await work();
    return { ok: true, value, elapsedMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      ok: false,
      reason: toFailure(error),
      elapsedMs: Math.round(performance.now() - started),
    };
  }
};

/**
 * A fresh Resolver per query, because `setServers` mutates the instance and every server is queried
 * in parallel. Sharing one would have them overwrite each other's target.
 *
 * `tries: 1` because the other nameservers are the retry. `timeout` is a backstop that stops the
 * socket lingering; the deadline that decides the answer is applied in trace.ts, so it holds for
 * the fake resolver too.
 */
const resolverFor = (server: string, timeoutMs: number) => {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
  resolver.setServers([server]);
  return resolver;
};

export const createNodeResolver = (timeoutMs: number): DnsResolver => ({
  resolveNs: (name) => timed(() => new Resolver({ timeout: timeoutMs, tries: 1 }).resolveNs(name)),

  resolveAddresses: (hostname) =>
    timed(() => new Resolver({ timeout: timeoutMs, tries: 1 }).resolve4(hostname)),

  // The addresses below come from the zone being checked, so the person being checked picks them.
  // Refusing the ones that are not globally reachable stops a zone using us to probe our own
  // network, and the refusal shows up in the trace rather than disappearing.
  resolveTxt: async (server, name) => {
    if (!isQueryableAddress(server)) {
      return { ok: false, reason: { code: 'address_not_public', address: server }, elapsedMs: 0 };
    }
    return timed(async () => joinRecords(await resolverFor(server, timeoutMs).resolveTxt(name)));
  },

  resolveSoaMinTtl: async (server, zone) => {
    if (!isQueryableAddress(server)) {
      return { ok: false, reason: { code: 'address_not_public', address: server }, elapsedMs: 0 };
    }
    return timed(async () => (await resolverFor(server, timeoutMs).resolveSoa(zone)).minttl);
  },
});
