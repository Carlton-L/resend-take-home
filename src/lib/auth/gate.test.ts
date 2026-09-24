// src/lib/auth/gate.test.ts
import { describe, expect, it } from 'vitest';
import { gateFor } from '@/lib/auth/gate';

const at = (path: string) => {
  const url = new URL(path, 'https://example.com');
  return { pathname: url.pathname, search: url.search };
};

describe('gateFor', () => {
  it.each(['/domains', '/claim', '/claim/0b4f6c1e-2f39-4d53-9d0c-5b1c8f2a7e11'])(
    'sends a signed out request for %s to sign in, carrying where it was going',
    (path) => {
      expect(gateFor(at(path), false)).toBe(`/signin?next=${encodeURIComponent(path)}`);
    },
  );

  it('keeps the query string in next', () => {
    expect(gateFor(at('/claim?error=limited'), false)).toBe(
      `/signin?next=${encodeURIComponent('/claim?error=limited')}`,
    );
  });

  it('does not treat a path that only starts with the same letters as an app page', () => {
    expect(gateFor(at('/domainsX'), false)).toBeNull();
    expect(gateFor(at('/claims'), false)).toBeNull();
  });

  it.each(['/', '/signin', '/auth/link-expired'])(
    'lets a signed out request for %s through',
    (path) => {
      expect(gateFor(at(path), false)).toBeNull();
    },
  );

  it('sends a signed in request for the landing page to the domains', () => {
    expect(gateFor(at('/'), true)).toBe('/domains');
  });

  it('sends a signed in request for sign in to where it was going', () => {
    expect(gateFor(at('/signin?next=%2Fclaim%2Fabc'), true)).toBe('/claim/abc');
  });

  it('ignores a next that leaves the site', () => {
    expect(gateFor(at('/signin?next=https%3A%2F%2Fevil.example'), true)).toBe('/domains');
    expect(gateFor(at('/signin?next=%2F%2Fevil.example'), true)).toBe('/domains');
  });

  it('lets a signed in request for an app page through', () => {
    expect(gateFor(at('/domains'), true)).toBeNull();
  });
});
