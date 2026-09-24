// src/lib/claims/token.ts
import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * RFC 4648 base32, upper case, no padding.
 *
 * Upper case because DNS panels and mail clients fold case in places we do not control, and a
 * value that survives being lower cased is one less way for a correct paste to read as wrong.
 * Base32 rather than base64 for the same reason: no case dependence, and no `+` or `/` to be
 * escaped by a panel that thinks it is handling a URL.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 160 bits. 20 bytes divides by 5, so the encoding comes out at 32 characters with no padding. */
export const TOKEN_BYTES = 20;

export const TOKEN_LENGTH = 32;

export const encodeBase32 = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
};

/**
 * The token is public by design. It goes into a TXT record in a zone anyone can query, so there is
 * nothing to protect by hashing it at rest and nothing to defend with a constant-time comparison.
 * What it has to be is unguessable, which is what the 160 bits are for.
 */
export const generateToken = (): string => encodeBase32(randomBytes(TOKEN_BYTES));

export const isWellFormedToken = (value: string): boolean =>
  value.length === TOKEN_LENGTH && /^[A-Z2-7]+$/.test(value);
