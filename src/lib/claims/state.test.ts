// src/lib/claims/state.test.ts
import { describe, expect, it } from 'vitest';
import { isClaimId } from '@/lib/claims/config';
import { CLAIM_STATUSES, OWNED_STATUSES } from '@/lib/claims/state';

describe('claim states', () => {
  it('draws the owned set from the state list', () => {
    for (const status of OWNED_STATUSES) {
      expect(CLAIM_STATUSES).toContain(status);
    }
  });

  // Dropping contested would take the incumbent out of the unique index for the length of a
  // contest, and a third account could verify the name underneath both of them.
  it('counts a contested claim as holding the name', () => {
    expect(OWNED_STATUSES).toContain('contested');
  });

  it('does not count pending, so any number of attempts can exist on one name', () => {
    expect(OWNED_STATUSES).not.toContain('pending');
  });

  it('does not count revoked, so a name comes free again', () => {
    expect(OWNED_STATUSES).not.toContain('revoked');
  });
});

describe('isClaimId', () => {
  it('accepts a uuid', () => {
    expect(isClaimId('0b3f7c8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f')).toBe(true);
  });

  // Postgres refuses a malformed uuid with an error rather than an empty result, so anything that
  // reaches a query has to be checked first.
  it.each(['', 'not-a-uuid', '../../etc/passwd', "1' or '1'='1"])('refuses %s', (value) => {
    expect(isClaimId(value)).toBe(false);
  });
});
