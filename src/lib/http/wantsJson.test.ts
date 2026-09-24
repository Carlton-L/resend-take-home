// src/lib/http/wantsJson.test.ts
import { describe, expect, it } from 'vitest';
import { wantsJson } from '@/lib/http/wantsJson';

const request = (headers: Record<string, string>) =>
  new Request('https://example.com/api/claims', { method: 'POST', headers });

describe('wantsJson', () => {
  it('is true when the request asks for JSON', () => {
    expect(wantsJson(request({ accept: 'application/json' }))).toBe(true);
  });

  it('is true when the request sends JSON', () => {
    expect(wantsJson(request({ 'content-type': 'application/json' }))).toBe(true);
  });

  it('is false for a browser form post', () => {
    expect(
      wantsJson(
        request({
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'content-type': 'application/x-www-form-urlencoded',
        }),
      ),
    ).toBe(false);
  });

  it('is false with no headers', () => {
    expect(wantsJson(request({}))).toBe(false);
  });
});
