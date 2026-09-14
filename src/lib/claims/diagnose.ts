// src/lib/claims/diagnose.ts
import { randomBytes } from 'node:crypto';
import { parseRecordValue, recordFullName } from '@/lib/claims/record';
import type { CheckResult } from '@/lib/claims/state';
import { serverResponded } from '@/lib/dns/trace';
import type { DnsResolver, Trace } from '@/lib/dns/types';

/** A probe is a second opinion on a check that already failed, so it gets a short leash. */
const PROBE_TIMEOUT_MS = 1000;

export type ClaimForDiagnosis = {
  name: string;
  token: string;
};

const deadline = async <T>(work: Promise<T>, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
};

/** A server that already answered in the trace, so a probe is not spent discovering a dead one. */
const liveAddress = (trace: Trace): string | null =>
  trace.servers.find((server) => serverResponded(server.result))?.address ?? null;

/**
 * Nothing at the name. Ask the same servers for the name with the zone on the end of it again.
 *
 * Every DNS panel measured so far appends the zone to its Name field, so a person who pastes the
 * full name gets the record at `_x.example.com.example.com`. Finding it there turns a dead end into
 * one instruction. The published remedy for this elsewhere is a trailing dot, and the one registrar
 * we measured rejects trailing dots, so detecting it beats the documented fix.
 */
const probeAppendedZone = async (
  resolver: DnsResolver,
  trace: Trace,
  claim: ClaimForDiagnosis,
  result: CheckResult,
): Promise<CheckResult> => {
  const address = liveAddress(trace);
  if (trace.zone === null || address === null) {
    return result;
  }

  const doubled = `${recordFullName(claim.name)}.${trace.zone}`;
  const outcome = await deadline(resolver.resolveTxt(address, doubled), null);
  if (outcome === null || !outcome.ok) {
    return result;
  }

  // Only our own token counts. Someone else's TXT one level down says nothing about this claim.
  const ours = outcome.value.some((record) => parseRecordValue(record)?.token === claim.token);
  if (!ours) {
    return result;
  }

  return {
    status: 'failed',
    reason: {
      code: 'appended_zone_suspected',
      queriedName: trace.queriedName,
      foundAt: doubled,
    },
  };
};

/**
 * The name answered with no TXT. Ask for a name nobody could have configured.
 *
 * A zone with a wildcard, or a provider that answers NODATA instead of NXDOMAIN, makes every name
 * in the zone exist. Then a record that was never added looks exactly like a record saved under the
 * wrong type, and telling the person to go change its type sends them looking for something that is
 * not there. If a random name answers the same way, this answer carries no information and the
 * honest reading is that the record is simply not there yet.
 */
const probeWildcard = async (
  resolver: DnsResolver,
  trace: Trace,
  result: CheckResult,
): Promise<CheckResult> => {
  const address = liveAddress(trace);
  if (trace.zone === null || address === null) {
    return result;
  }

  const probe = `dc-probe-${randomBytes(8).toString('hex')}.${trace.zone}`;
  const outcome = await deadline(resolver.resolveTxt(address, probe), null);
  if (outcome === null) {
    return result;
  }

  // A name that does not exist is the normal answer and leaves the original reading alone. Anything
  // else, records or an empty answer, means the zone answers for names nobody created. A refusal or
  // a timeout tells us nothing either way, so it changes nothing.
  const answersForAnything = outcome.ok || outcome.reason.code === 'no_data';
  if (!answersForAnything) {
    return result;
  }

  return {
    status: 'failed',
    reason: {
      code: 'record_not_found',
      queriedName: trace.queriedName,
      nameservers: [...trace.nameservers],
      negativeTtlSeconds: trace.negativeTtlSeconds,
    },
  };
};

/**
 * A second look at a check that failed, using questions the first pass had no reason to ask.
 *
 * Runs only on the two reasons a probe can speak to, only after a failure, and only against a
 * server that already answered. A check that succeeded costs nothing, and neither does one that
 * failed for a reason no probe can explain.
 */
export const diagnose = async (
  resolver: DnsResolver,
  trace: Trace | null,
  claim: ClaimForDiagnosis,
  result: CheckResult,
): Promise<CheckResult> => {
  if (trace === null || result.status !== 'failed') {
    return result;
  }

  switch (result.reason.code) {
    case 'record_not_found':
      return probeAppendedZone(resolver, trace, claim, result);
    case 'no_txt_at_name':
      return probeWildcard(resolver, trace, result);
    default:
      return result;
  }
};
