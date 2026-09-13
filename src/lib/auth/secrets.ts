// src/lib/auth/secrets.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Keeps the parts of a signed message from running into each other. */
const SEPARATOR = '\x00';

/**
 * One key, several uses, kept apart by a purpose string mixed into every message. Reusing a key
 * across purposes without that separation lets a value signed for one use be replayed as another.
 */
const key = (): string => {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error('AUTH_SECRET is not set. Generate one with: openssl rand -base64 32');
  }
  return value;
};

const digest = (purpose: string, message: string): string =>
  createHmac('sha256', key())
    .update(purpose + SEPARATOR + message)
    .digest('base64url');

/**
 * A stable, unguessable stand-in for an address or an IP, so the rate limit table can count without
 * becoming a list of everyone who typed something into the form. An IP is personal data, and an
 * address someone mistyped is a stranger's. A plain hash would not do this job, because the space
 * of real addresses is small enough to walk.
 */
export const identifierHash = (kind: 'email' | 'ip', value: string): string =>
  digest(`rate-limit:${kind}`, value.toLowerCase());

/** Everything the confirmation page trusts about a link, in a fixed order. */
export type ConfirmLinkClaims = {
  tokenHash: string;
  email: string;
  next: string | null;
};

const canonical = ({ tokenHash, email, next }: ConfirmLinkClaims): string =>
  [tokenHash, email.toLowerCase(), next ?? ''].join(SEPARATOR);

export const signConfirmLink = (claims: ConfirmLinkClaims): string =>
  digest('confirm-link', canonical(claims));

/**
 * Constant time comparison, so a signature cannot be recovered one character at a time by timing
 * the responses.
 */
export const confirmLinkSignatureValid = (
  claims: ConfirmLinkClaims,
  signature: string,
): boolean => {
  const expected = Buffer.from(signConfirmLink(claims));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) {
    return false;
  }
  return timingSafeEqual(expected, given);
};
