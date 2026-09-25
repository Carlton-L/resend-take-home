// src/lib/auth/oauth.test.ts
import { describe, expect, it } from 'vitest';
import { isOAuthProvider, oauthCallbackUrl } from '@/lib/auth/oauth';

describe('isOAuthProvider', () => {
  it('accepts GitHub, the one provider the screen offers', () => {
    expect(isOAuthProvider('github')).toBe(true);
  });

  it('refuses anything else, including a provider Supabase supports and we do not offer', () => {
    expect(isOAuthProvider('google')).toBe(false);
    expect(isOAuthProvider('azure')).toBe(false);
    expect(isOAuthProvider('GitHub')).toBe(false);
    expect(isOAuthProvider('')).toBe(false);
  });
});

describe('oauthCallbackUrl', () => {
  it('returns to our callback on the configured origin', () => {
    expect(oauthCallbackUrl('https://domainclaim.example', null)).toBe(
      'https://domainclaim.example/api/auth/callback',
    );
  });

  it('carries a safe next path through', () => {
    expect(oauthCallbackUrl('https://domainclaim.example', '/claim/abc')).toBe(
      'https://domainclaim.example/api/auth/callback?next=%2Fclaim%2Fabc',
    );
  });

  it('drops a next that would leave the site', () => {
    expect(oauthCallbackUrl('https://domainclaim.example', '//evil.example')).toBe(
      'https://domainclaim.example/api/auth/callback',
    );
  });
});
