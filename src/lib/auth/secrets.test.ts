// src/lib/auth/secrets.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import {
  type ConfirmLinkClaims,
  confirmLinkSignatureValid,
  identifierHash,
  signConfirmLink,
} from '@/lib/auth/secrets';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-for-unit-tests';
});

const claims: ConfirmLinkClaims = {
  tokenHash: 'a'.repeat(56),
  email: 'carlton@example.com',
  next: '/claim',
};

describe('identifierHash', () => {
  it('gives the same value for the same input', () => {
    expect(identifierHash('email', 'a@example.com')).toBe(identifierHash('email', 'a@example.com'));
  });

  it('ignores case, so one address is one bucket', () => {
    expect(identifierHash('email', 'A@Example.com')).toBe(identifierHash('email', 'a@example.com'));
  });

  it('never returns the value it was given', () => {
    expect(identifierHash('email', 'a@example.com')).not.toContain('example.com');
  });

  it('separates the two kinds, so one value cannot be counted as the other', () => {
    expect(identifierHash('email', '203.0.113.5')).not.toBe(identifierHash('ip', '203.0.113.5'));
  });
});

describe('confirm link signature', () => {
  it('accepts a signature over the same claims', () => {
    expect(confirmLinkSignatureValid(claims, signConfirmLink(claims))).toBe(true);
  });

  it('refuses a changed address, which is the display the page trusts', () => {
    const signature = signConfirmLink(claims);
    expect(confirmLinkSignatureValid({ ...claims, email: 'victim@example.com' }, signature)).toBe(
      false,
    );
  });

  it('refuses a changed token', () => {
    const signature = signConfirmLink(claims);
    expect(confirmLinkSignatureValid({ ...claims, tokenHash: 'b'.repeat(56) }, signature)).toBe(
      false,
    );
  });

  it('refuses a changed destination', () => {
    const signature = signConfirmLink(claims);
    expect(confirmLinkSignatureValid({ ...claims, next: '/somewhere-else' }, signature)).toBe(
      false,
    );
  });

  it('refuses a signature of the wrong length without throwing', () => {
    expect(confirmLinkSignatureValid(claims, 'short')).toBe(false);
    expect(confirmLinkSignatureValid(claims, '')).toBe(false);
  });

  it('cannot be fooled by moving a separator between the fields', () => {
    const a = signConfirmLink({ tokenHash: 'ab', email: 'c@d.e', next: '/x' });
    const b = signConfirmLink({ tokenHash: 'a', email: 'bc@d.e', next: '/x' });
    expect(a).not.toBe(b);
  });
});
