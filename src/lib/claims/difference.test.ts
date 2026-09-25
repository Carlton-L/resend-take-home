// src/lib/claims/difference.test.ts
import { describe, expect, it } from 'vitest';
import { splitAtDifference } from '@/lib/claims/difference';

describe('splitAtDifference', () => {
  it('marks the tail after a token from another claim', () => {
    expect(
      splitAtDifference('domainclaim-token=AAAB expiry=Z', 'domainclaim-token=AAAC expiry=Z'),
    ).toEqual({ same: 'domainclaim-token=AAA', rest: 'B expiry=Z' });
  });

  it('marks nothing on a paste that lost its end, since what is there matches', () => {
    expect(splitAtDifference('domainclaim-token=AAAB', 'domainclaim-token=AAAB expiry=Z')).toEqual({
      same: 'domainclaim-token=AAAB',
      rest: '',
    });
  });

  it('marks the zone typed a second time', () => {
    expect(
      splitAtDifference('_domainclaim-challenge.a.com.a.com', '_domainclaim-challenge.a.com'),
    ).toEqual({ same: '_domainclaim-challenge.a.com', rest: '.a.com' });
  });

  it('marks all of a value with nothing in common', () => {
    expect(splitAtDifference('v=spf1 -all', 'domainclaim-token=A')).toEqual({
      same: '',
      rest: 'v=spf1 -all',
    });
  });
});
