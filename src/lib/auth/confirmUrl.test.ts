// src/lib/auth/confirmUrl.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { buildConfirmUrl } from '@/lib/auth/confirmUrl';
import { confirmLinkSignatureValid } from '@/lib/auth/secrets';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-for-unit-tests';
  process.env.APP_ORIGIN = 'https://domainclaim.example';
});

const tokenHash = 'a'.repeat(56);

const paramsOf = (url: string) => new URL(url).searchParams;

describe('buildConfirmUrl', () => {
  it('points at our own confirmation route', () => {
    const url = new URL(buildConfirmUrl({ tokenHash, email: 'a@example.com', next: null }));
    expect(url.origin).toBe('https://domainclaim.example');
    expect(url.pathname).toBe('/auth/confirm');
  });

  it('carries the token and the address', () => {
    const params = paramsOf(buildConfirmUrl({ tokenHash, email: 'A@Example.com', next: null }));
    expect(params.get('token_hash')).toBe(tokenHash);
    expect(params.get('email')).toBe('a@example.com');
  });

  it('signs what the page will display', () => {
    const params = paramsOf(buildConfirmUrl({ tokenHash, email: 'a@example.com', next: '/claim' }));
    const valid = confirmLinkSignatureValid(
      { tokenHash: params.get('token_hash') ?? '', email: 'a@example.com', next: '/claim' },
      params.get('sig') ?? '',
    );
    expect(valid).toBe(true);
  });

  it('keeps a destination on this site', () => {
    const params = paramsOf(buildConfirmUrl({ tokenHash, email: 'a@example.com', next: '/claim' }));
    expect(params.get('next')).toBe('/claim');
  });

  it('drops a destination that leaves the site rather than signing it', () => {
    const params = paramsOf(
      buildConfirmUrl({ tokenHash, email: 'a@example.com', next: '//evil.example' }),
    );
    expect(params.get('next')).toBeNull();
    const valid = confirmLinkSignatureValid(
      { tokenHash, email: 'a@example.com', next: null },
      params.get('sig') ?? '',
    );
    expect(valid).toBe(true);
  });

  it('never puts the address in the path, where it would reach a server log', () => {
    const url = new URL(buildConfirmUrl({ tokenHash, email: 'a@example.com', next: null }));
    expect(url.pathname).not.toContain('a@example.com');
  });
});
