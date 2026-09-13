// src/lib/claims/token.test.ts
import { describe, expect, it } from 'vitest';
import { encodeBase32, generateToken, isWellFormedToken, TOKEN_LENGTH } from '@/lib/claims/token';

describe('encodeBase32', () => {
  // RFC 4648 section 10.
  it.each([
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes %s as %s, matching the RFC 4648 vectors', (input, expected) => {
    expect(encodeBase32(new TextEncoder().encode(input))).toBe(expected);
  });

  it('uses no padding, so nothing has to be stripped before the value goes into DNS', () => {
    expect(encodeBase32(new TextEncoder().encode('f'))).not.toContain('=');
  });
});

describe('generateToken', () => {
  it('is 32 characters, which is what 160 bits comes to with no remainder', () => {
    expect(generateToken()).toHaveLength(TOKEN_LENGTH);
  });

  it('uses only the upper case alphabet, so a panel folding case cannot change it', () => {
    expect(generateToken()).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateToken));
    expect(tokens.size).toBe(500);
  });
});

describe('isWellFormedToken', () => {
  it('accepts what generateToken produces', () => {
    expect(isWellFormedToken(generateToken())).toBe(true);
  });

  it.each([
    ['too short', 'ABC'],
    ['lower case', 'a'.repeat(32)],
    ['base32 has no 0, 1 or 8', `${'A'.repeat(31)}0`],
    ['empty', ''],
  ])('refuses %s', (_label, value) => {
    expect(isWellFormedToken(value)).toBe(false);
  });
});
