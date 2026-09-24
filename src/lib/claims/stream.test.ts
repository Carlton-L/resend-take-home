// src/lib/claims/stream.test.ts
import { describe, expect, it } from 'vitest';
import { diagnose } from '@/lib/claims/diagnose';
import { claimAfterCheck, evaluateClaim } from '@/lib/claims/evaluate';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import type { ClaimStatus } from '@/lib/claims/state';
import { stepsFor } from '@/lib/claims/steps';
import { earlySteps, encodeEvent } from '@/lib/claims/stream';
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { scriptFor, testNames } from '@/lib/dns/testNames';
import { traceName } from '@/lib/dns/trace';

const TIMEOUT_MS = 40;
const TOKEN = 'MZXW6YTBOIMZXW6YTBOIMZXW6YTBOIQ7';
const EXPIRES = new Date('2099-01-01T00:00:00Z');
const NOW = new Date('2026-09-13T12:00:00Z');

const STATUSES: { status: ClaimStatus; verifiedAt: Date | null }[] = [
  { status: 'pending', verifiedAt: null },
  { status: 'verified', verifiedAt: new Date('2026-09-01T00:00:00Z') },
  { status: 'at_risk', verifiedAt: new Date('2026-09-01T00:00:00Z') },
];

describe('earlySteps', () => {
  // The stream sends steps 01 and 02 before the second look and the write. This holds that they
  // never differ from the answer the check ends with, for every scripted outcome.
  for (const name of testNames()) {
    for (const row of STATUSES) {
      it(`matches the final steps for ${name} on a ${row.status} claim`, async () => {
        const script = scriptFor(name, formatRecordValue(TOKEN, EXPIRES));
        if (script === null) {
          throw new Error(`no demo script for ${name}`);
        }
        const resolver = createFakeResolver(script);
        const claim = { name, token: TOKEN, expiresAt: EXPIRES, ...row };
        const trace = await traceName(resolver, recordFullName(name), { timeoutMs: TIMEOUT_MS });
        const result = evaluateClaim(trace, claim, NOW);
        const early = earlySteps(claim, { trace, result }, NOW);

        const final = await diagnose(resolver, trace, claim, result);
        const finalSteps = stepsFor({
          trace,
          result: final,
          ...claimAfterCheck(claim, final.status === 'verified' ? 'verified' : null, NOW, final),
        });

        expect(early).toEqual(finalSteps.slice(0, 2));
      });
    }
  }
});

describe('encodeEvent', () => {
  it('writes one JSON object per line', () => {
    const line = encodeEvent({ type: 'error', error: 'unavailable' });
    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line)).toEqual({ type: 'error', error: 'unavailable' });
  });
});
