// src/lib/claims/record.test.ts
import { describe, expect, it } from 'vitest';
import { RECORD_LABEL } from '@/lib/claims/config';
import {
  formatExpiry,
  formatRecordValue,
  parseRecordValue,
  recordFullName,
  recordRelativeHost,
} from '@/lib/claims/record';

const EXPIRES = new Date('2026-09-20T18:42:07.913Z');
const TOKEN = 'MZXW6YTBOIMZXW6YTBOIMZXW6YTBOIQ7';

describe('recordFullName', () => {
  it('puts the scoped label in front of the claimed name', () => {
    expect(recordFullName('example.com')).toBe(`${RECORD_LABEL}.example.com`);
  });

  it('keeps the whole name for a subdomain, which is claimed separately from its parent', () => {
    expect(recordFullName('app.example.com')).toBe(`${RECORD_LABEL}.app.example.com`);
  });
});

describe('recordRelativeHost', () => {
  it('is the bare label at an apex', () => {
    expect(recordRelativeHost('example.com', 'example.com')).toBe(RECORD_LABEL);
  });

  it('keeps the part of the name below the zone', () => {
    expect(recordRelativeHost('app.example.com', 'example.com')).toBe(`${RECORD_LABEL}.app`);
  });

  it('keeps every level below the zone', () => {
    expect(recordRelativeHost('a.b.example.com', 'example.com')).toBe(`${RECORD_LABEL}.a.b`);
  });

  // A name that does not sit under the zone we were given means the zone is wrong, and a host
  // built from it would be wrong in a way the user could not see.
  it('falls back to the full name when the name is not under the zone', () => {
    expect(recordRelativeHost('example.com', 'other.com')).toBe(`${RECORD_LABEL}.example.com`);
  });

  it('does not treat a shared ending as a zone boundary', () => {
    expect(recordRelativeHost('notexample.com', 'example.com')).toBe(
      `${RECORD_LABEL}.notexample.com`,
    );
  });
});

describe('formatExpiry', () => {
  it('drops the fractional seconds, which tell a person reading a DNS panel nothing', () => {
    expect(formatExpiry(EXPIRES)).toBe('2026-09-20T18:42:07Z');
  });
});

describe('formatRecordValue', () => {
  const value = formatRecordValue(TOKEN, EXPIRES);

  it('is the shape the RFC states', () => {
    expect(value).toBe(`domainclaim-token=${TOKEN} expiry=2026-09-20T18:42:07Z`);
  });

  it('stays well inside 255 bytes, so no resolver splits it across strings', () => {
    expect(Buffer.byteLength(value, 'utf8')).toBeLessThan(255);
  });

  it('has no leading or trailing whitespace to survive a paste', () => {
    expect(value).toBe(value.trim());
  });
});

describe('parseRecordValue', () => {
  it('reads back what formatRecordValue wrote', () => {
    expect(parseRecordValue(formatRecordValue(TOKEN, EXPIRES))).toEqual({
      token: TOKEN,
      expiry: '2026-09-20T18:42:07Z',
    });
  });

  it('ignores a record belonging to something else', () => {
    expect(parseRecordValue('v=spf1 include:example.com ~all')).toBeNull();
    expect(parseRecordValue('google-site-verification=abc123')).toBeNull();
  });

  it('tolerates one pair of wrapping quotes, which some panels store literally', () => {
    expect(
      parseRecordValue(`"domainclaim-token=${TOKEN} expiry=2026-09-20T18:42:07Z"`)?.token,
    ).toBe(TOKEN);
  });

  it('tolerates extra whitespace around and between the halves', () => {
    expect(
      parseRecordValue(`  domainclaim-token=${TOKEN}   expiry=2026-09-20T18:42:07Z  `),
    ).toEqual({ token: TOKEN, expiry: '2026-09-20T18:42:07Z' });
  });

  it('reads a value whose expiry was cut off, which is what a partial paste looks like', () => {
    expect(parseRecordValue(`domainclaim-token=${TOKEN}`)).toEqual({ token: TOKEN, expiry: null });
  });

  it('reads the halves in either order', () => {
    expect(parseRecordValue(`expiry=2026-09-20T18:42:07Z domainclaim-token=${TOKEN}`)?.token).toBe(
      TOKEN,
    );
  });

  // startsWith on a whitespace-separated part, so a key that merely ends in ours is not ours.
  it('does not read a different key that ends with our key name', () => {
    expect(parseRecordValue(`x-domainclaim-token=${TOKEN}`)).toBeNull();
  });

  // A folded token is a different string. Accepting it would report a match for a record that
  // does not carry the value we issued.
  it('does not fold case in the token', () => {
    expect(parseRecordValue(`domainclaim-token=${TOKEN.toLowerCase()}`)?.token).not.toBe(TOKEN);
  });
});
