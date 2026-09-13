// src/lib/http/sameOrigin.test.ts
import { describe, expect, it } from 'vitest';
import { isSameOrigin } from '@/lib/http/sameOrigin';

const post = (headers: Record<string, string>) =>
  new Request('https://domainclaim.example/api/claims', { method: 'POST', headers });

describe('isSameOrigin', () => {
  it('accepts a post from a page on the same host', () => {
    expect(isSameOrigin(post({ origin: 'https://domainclaim.example' }))).toBe(true);
  });

  it('refuses a post from another site', () => {
    expect(isSameOrigin(post({ origin: 'https://not-us.example' }))).toBe(false);
  });

  // Every current browser sends Origin on a same-origin POST. Refusing when it is absent keeps a
  // non-browser client from reaching a state-changing route by leaving the header off.
  it('refuses a post with no Origin at all', () => {
    expect(isSameOrigin(post({}))).toBe(false);
  });

  // The deployment host is what the request arrived on, and on a preview that is not APP_ORIGIN.
  it('compares against the forwarded host ahead of the URL', () => {
    const request = new Request('https://internal.vercel/api/claims', {
      method: 'POST',
      headers: {
        origin: 'https://preview-abc.vercel.app',
        'x-forwarded-host': 'preview-abc.vercel.app',
      },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it('refuses a subdomain of the deployment host', () => {
    expect(isSameOrigin(post({ origin: 'https://evil.domainclaim.example' }))).toBe(false);
  });

  it('refuses an Origin that is not a URL', () => {
    expect(isSameOrigin(post({ origin: 'null' }))).toBe(false);
  });
});
