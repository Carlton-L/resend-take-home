// src/lib/auth/nextPath.test.ts
import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/auth/nextPath';

describe('safeNextPath', () => {
  it.each(['/claim', '/claim?domain=example.com', '/a/b/c', '/claim#record'])(
    'keeps %s, which stays on this site',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    ['https://evil.example', 'an absolute URL'],
    ['//evil.example', 'protocol relative'],
    ['/\\evil.example', 'protocol relative written with a backslash'],
    ['/claim\\..\\evil', 'a backslash anywhere else'],
    ['claim', 'no leading slash'],
    ['/claim\nSet-Cookie: a=b', 'a newline'],
    ['/claim\tx', 'a tab'],
    ['', 'an empty string'],
  ])('refuses %s, %s', (path) => {
    expect(safeNextPath(path)).toBeNull();
  });

  it.each([null, undefined])('refuses %s', (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
