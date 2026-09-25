// src/lib/claims/record.ts
import { RECORD_LABEL } from '@/lib/claims/config';

/** The full DNS name the record lives at. */
export const recordFullName = (claimedName: string): string => `${RECORD_LABEL}.${claimedName}`;

/**
 * The host as most DNS panels want it: relative to the zone, with the zone left off.
 *
 * Squarespace appends the zone to this field unconditionally, measured 2026-09-12, and rejects a
 * trailing dot, so there is no escape hatch and the relative form is the only one that works
 * there. Every panel accepts the relative form; not every panel accepts the full one.
 *
 * The zone is the registrable domain until a trace says otherwise. A delegated subdomain is its
 * own zone and would take a shorter host, which the check can correct once it has walked.
 */
export const recordRelativeHost = (claimedName: string, zone: string): string => {
  if (claimedName === zone) {
    return RECORD_LABEL;
  }
  const suffix = `.${zone}`;
  if (!claimedName.endsWith(suffix)) {
    return recordFullName(claimedName);
  }
  return `${RECORD_LABEL}.${claimedName.slice(0, -suffix.length)}`;
};

/**
 * Seconds precision, no milliseconds. The value is read by a person in a DNS panel and the
 * fractional part tells them nothing. It also keeps the whole value at 78 bytes, comfortably
 * inside the 255 byte limit where a TXT value starts being split across strings.
 */
export const formatExpiry = (expiresAt: Date): string => `${expiresAt.toISOString().slice(0, 19)}Z`;

export const formatRecordValue = (token: string, expiresAt: Date): string =>
  `domainclaim-token=${token} expiry=${formatExpiry(expiresAt)}`;

export type ParsedRecord = {
  token: string;
  /** Null when the value carries a token and no expiry, which is what a truncated paste looks like. */
  expiry: string | null;
};

const TOKEN_KEY = 'domainclaim-token=';
const EXPIRY_KEY = 'expiry=';

/**
 * Reads one TXT value back. Returns null for a value that is not ours at all, which is the common
 * case: a verification name can sit beside records belonging to other services.
 *
 * Tolerant of one pair of wrapping quotes and of extra whitespace, because panels add both. Not
 * tolerant of case in the token, since the token is defined as upper case and a folded one is a
 * different string that should be reported rather than quietly accepted.
 */
export const parseRecordValue = (raw: string): ParsedRecord | null => {
  const unquoted = raw.trim().replace(/^"([^\n]*)"$/, '$1');
  const parts = unquoted.trim().split(/\s+/);

  const tokenPart = parts.find((part) => part.startsWith(TOKEN_KEY));
  if (tokenPart === undefined) {
    return null;
  }
  const expiryPart = parts.find((part) => part.startsWith(EXPIRY_KEY));

  return {
    token: tokenPart.slice(TOKEN_KEY.length),
    expiry: expiryPart === undefined ? null : expiryPart.slice(EXPIRY_KEY.length),
  };
};

/**
 * The values at the name that are ours. A zone can hold TXT records for other services at the
 * record's name, most often through a wildcard (`*.apple.com` answers every name with its SPF
 * record). Those say nothing about this claim, so they don't count as finding the record.
 */
export const claimRecords = (records: readonly string[]): string[] =>
  records.filter((record) => parseRecordValue(record) !== null);
