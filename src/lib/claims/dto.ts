// src/lib/claims/dto.ts
import { RECORD_TYPE } from '@/lib/claims/config';
import { panelUrlFor } from '@/lib/claims/provider';
import { formatRecordValue, recordFullName, recordRelativeHost } from '@/lib/claims/record';
import type { ClaimStatus } from '@/lib/claims/state';

/**
 * A claim as the API sends it. Dates are ISO strings, because that is what survives
 * `JSON.stringify`, and the type says so. The browser turns them back into dates only where it
 * formats them.
 *
 * No token and no owner id. The token reaches the browser only inside the record value, on the one
 * screen that shows it.
 */
export type ClaimDTO = {
  id: string;
  name: string;
  status: ClaimStatus;
  issuedAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  failingSince: string | null;
  actionNeededSince: string | null;
  lastCheckedAt: string | null;
  /** Who serves the zone, per the last check. Null before one, or when it found no nameservers. */
  dnsHost: string | null;
  /** The DNS panel for that host, or null when we don't link to it. */
  dnsPanelUrl: string | null;
};

/** One claim plus what its screen needs: the record, and whether another account holds it. */
export type ClaimDetailDTO = ClaimDTO & {
  record: {
    type: typeof RECORD_TYPE;
    /** Relative to the zone, the way most panels want the Name field. */
    host: string;
    /** For panels that don't append the domain. */
    fullName: string;
    value: string;
  };
  /** Another account holds this name, so proving control here will not take it over. */
  heldByAnother: boolean;
};

/**
 * The columns the mappers read. Declared here rather than imported from the store, so this module
 * stays one the browser can load.
 */
export type ClaimFields = {
  id: string;
  name: string;
  status: ClaimStatus;
  issuedAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  failingSince: Date | null;
  actionNeededSince: Date | null;
  lastCheckedAt: Date | null;
  dnsHost: string | null;
};

const iso = (value: Date | null): string | null => (value === null ? null : value.toISOString());

export const toClaimDTO = (claim: ClaimFields): ClaimDTO => ({
  id: claim.id,
  name: claim.name,
  status: claim.status,
  issuedAt: claim.issuedAt.toISOString(),
  expiresAt: claim.expiresAt.toISOString(),
  verifiedAt: iso(claim.verifiedAt),
  failingSince: iso(claim.failingSince),
  actionNeededSince: iso(claim.actionNeededSince),
  lastCheckedAt: iso(claim.lastCheckedAt),
  dnsHost: claim.dnsHost,
  dnsPanelUrl: panelUrlFor(claim.dnsHost),
});

/**
 * The zone is the registrable domain until a check says otherwise, the same assumption the record
 * screen has always made. A delegated subdomain would take a shorter host.
 */
export const toClaimDetailDTO = (
  claim: ClaimFields & { registrableDomain: string; token: string },
  heldByAnother: boolean,
): ClaimDetailDTO => ({
  ...toClaimDTO(claim),
  record: {
    type: RECORD_TYPE,
    host: recordRelativeHost(claim.name, claim.registrableDomain),
    fullName: recordFullName(claim.name),
    value: formatRecordValue(claim.token, claim.expiresAt),
  },
  heldByAnother,
});

/** A DTO date back to a Date, for the formatters. */
export const parseDate = (value: string | null): Date | null =>
  value === null ? null : new Date(value);

/**
 * What each endpoint answers. A typed value on both ends, the same pattern as `CheckResponse`. The
 * HTTP status is set to match, so logs read right, and the client reads this.
 */
export type MeResponse =
  | {
      ok: true;
      email: string;
      /** Whether `.test` demo names are accepted here, so the input can check them as you type. */
      testNamespace: boolean;
    }
  | { ok: false; error: 'signed_out' };

export type ClaimsResponse =
  | { ok: true; claims: ClaimDTO[] }
  | { ok: false; error: 'signed_out' | 'unavailable' };

export type ClaimResponse =
  | { ok: true; claim: ClaimDetailDTO }
  | { ok: false; error: 'signed_out' | 'not_found' | 'unavailable' };

export type CreateResponse =
  | {
      ok: true;
      id: string;
      /** `existing` when this account already had a claim on the name. */
      outcome: 'created' | 'existing';
      /** The existing claim's token had run out and was replaced. */
      reissued: boolean;
      heldByAnother: boolean;
    }
  | { ok: false; error: 'signed_out' | 'invalid' | 'limited' | 'unavailable' };

export type ReleaseResponse = { ok: true } | { ok: false; error: 'signed_out' };

export type SignOutResponse = { ok: true };
