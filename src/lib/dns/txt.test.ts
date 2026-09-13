// src/lib/dns/txt.test.ts
import { describe, expect, it } from 'vitest';
import { joinChunks, joinRecords } from '@/lib/dns/txt';

describe('joinChunks', () => {
  it('leaves a short value alone', () => {
    expect(joinChunks(['relative'])).toBe('relative');
  });

  it('rejoins a value split at the 255 byte boundary', () => {
    // The shape measured against _dc-long.carlton.dev: 300 bytes arrive as 255 plus 45.
    const first = '0'.repeat(255);
    const second = '1'.repeat(45);
    const joined = joinChunks([first, second]);
    expect(joined).toHaveLength(300);
    expect(joined).toBe(first + second);
  });

  it('adds nothing between the pieces', () => {
    // A separator here would corrupt any token that happens to straddle the boundary.
    expect(joinChunks(['abc', 'def'])).toBe('abcdef');
  });

  it('keeps quotes and spaces that are part of the value', () => {
    expect(joinChunks(['v=spf1 "quoted" ', 'include:example.com'])).toBe(
      'v=spf1 "quoted" include:example.com',
    );
  });

  it('gives an empty string for a record with no pieces', () => {
    expect(joinChunks([])).toBe('');
  });
});

describe('joinRecords', () => {
  it('flattens each record without merging them', () => {
    // Two TXT records at one name stay two values. Merging them would invent a string nobody
    // published, and the token match has to scan every record rather than index one.
    expect(joinRecords([['one', '-part'], ['two']])).toEqual(['one-part', 'two']);
  });

  it('gives an empty list when the name has no TXT at all', () => {
    expect(joinRecords([])).toEqual([]);
  });
});
