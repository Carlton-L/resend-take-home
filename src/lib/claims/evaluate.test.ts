// src/lib/claims/evaluate.test.ts
import { describe, expect, it } from 'vitest';
import {
  claimAfterCheck,
  evaluateClaim,
  isExpired,
  needsUserAction,
  provesRecordGone,
  shouldClearAction,
  shouldFlagAction,
  shouldMarkAtRisk,
  shouldMarkRecovered,
  shouldMarkVerified,
  tokenHasRunOut,
} from '@/lib/claims/evaluate';
import { formatRecordValue, recordFullName } from '@/lib/claims/record';
import type { CheckResult, ClaimStatus, FailureReason } from '@/lib/claims/state';
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { scriptFor } from '@/lib/dns/testNames';
import { traceName } from '@/lib/dns/trace';

/** Short so a hanging server costs the suite milliseconds instead of seconds. */
const TIMEOUT_MS = 40;

const CLAIM = {
  token: 'MZXW6YTBOIMZXW6YTBOIMZXW6YTBOIQ7',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  status: 'pending' as const,
};

const NOW = new Date('2026-09-13T12:00:00Z');
const EXPECTED = formatRecordValue(CLAIM.token, CLAIM.expiresAt);

/**
 * Real traces from the demo scripts rather than hand-built objects, so the comparison is tested
 * against the shapes the trace layer actually produces.
 */
const traceFor = async (name: string, status: ClaimStatus = 'pending') => {
  const script = scriptFor(name, EXPECTED, status);
  if (script === null) {
    throw new Error(`no demo script for ${name}`);
  }
  return traceName(createFakeResolver(script), recordFullName(name), { timeoutMs: TIMEOUT_MS });
};

describe('evaluateClaim', () => {
  it('verifies when a nameserver returns the value this claim issued', async () => {
    const result = evaluateClaim(await traceFor('verified.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'verified',
      record: EXPECTED,
      answeredBy: 'ns1.example-dns.test',
    });
  });

  it('verifies from one live server when another in the zone is dead', async () => {
    const result = evaluateClaim(await traceFor('one-dead-nameserver.test'), CLAIM, NOW);
    expect(result.status).toBe('verified');
  });

  it('finds our record among other services records at the same name', async () => {
    const result = evaluateClaim(await traceFor('crowded-name.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'verified',
      record: EXPECTED,
      answeredBy: 'ns1.example-dns.test',
    });
  });

  it('reports record_not_found with the negative cache window when the name does not exist', async () => {
    const result = evaluateClaim(await traceFor('record-not-found.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'record_not_found',
        queriedName: recordFullName('record-not-found.test'),
        nameservers: ['ns1.example-dns.test', 'ns2.example-dns.test', 'ns3.example-dns.test'],
        negativeTtlSeconds: 300,
      },
    });
  });

  it('reports no_txt_at_name when the name resolves with no TXT on it', async () => {
    const result = evaluateClaim(await traceFor('no-txt-at-name.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: { code: 'no_txt_at_name', queriedName: recordFullName('no-txt-at-name.test') },
    });
  });

  it('reports value_mismatch with what was found and what was expected', async () => {
    const result = evaluateClaim(await traceFor('value-mismatch.test'), CLAIM, NOW);
    expect(result.status).toBe('failed');
    if (result.status !== 'failed' || result.reason.code !== 'value_mismatch') {
      throw new Error('expected value_mismatch');
    }
    expect(result.reason.expected).toBe(EXPECTED);
    expect(result.reason.found).toHaveLength(1);
    expect(result.reason.found[0]).not.toBe(EXPECTED);
  });

  it('reads TXT records that are not ours as the record not being there', async () => {
    const result = evaluateClaim(await traceFor('other-txt.test'), CLAIM, NOW);
    expect(result.status === 'failed' && result.reason.code).toBe('record_not_found');
  });

  // flaky.test flips its record on every check, so each held state is one check away.
  it('walks flaky.test from verified to at risk and back', async () => {
    const found = evaluateClaim(await traceFor('flaky.test', 'pending'), CLAIM, NOW);
    expect(found.status).toBe('verified');
    const gone = evaluateClaim(await traceFor('flaky.test', 'verified'), CLAIM, NOW);
    expect(gone.status === 'failed' && gone.reason.code).toBe('record_not_found');
    const back = evaluateClaim(await traceFor('flaky.test', 'at_risk'), CLAIM, NOW);
    expect(back.status).toBe('verified');
  });

  it('reports nameservers_unreachable with the deadline it gave up after', async () => {
    const result = evaluateClaim(await traceFor('nameservers-unreachable.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'nameservers_unreachable',
        attempted: ['ns1.example-dns.test', 'ns2.example-dns.test', 'ns3.example-dns.test'],
        timeoutMs: TIMEOUT_MS,
      },
    });
  });

  it('reports zone_not_found with every level it tried', async () => {
    const result = evaluateClaim(await traceFor('zone-not-found.test'), CLAIM, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: {
        code: 'zone_not_found',
        walked: [recordFullName('zone-not-found.test'), 'zone-not-found.test'],
      },
    });
  });

  // The record value is written by whoever controls the zone. Reading expiry from it would let
  // anyone keep a dead claim alive by publishing a later date.
  it('expires from the claim row even when DNS holds a matching record', async () => {
    const expired = { ...CLAIM, expiresAt: new Date('2026-09-01T00:00:00Z') };
    const result = evaluateClaim(await traceFor('verified.test'), expired, NOW);
    expect(result).toEqual({
      status: 'failed',
      reason: { code: 'token_expired', expiredAt: expired.expiresAt },
    });
  });

  it('treats the moment of expiry as expired', () => {
    expect(isExpired({ expiresAt: NOW }, NOW)).toBe(true);
  });

  /**
   * Verifying does not clear `expires_at`, so every name held for longer than the token's seven
   * days carries an expiry in the past. Reading it without the status first stopped the check
   * before it asked DNS anything, which left a held claim that lost its record reporting an
   * expired token and unable to reach `at_risk` after its first week.
   */
  it('goes on checking a name the account holds, however old its token is', async () => {
    const stale = {
      ...CLAIM,
      expiresAt: new Date('2026-09-01T00:00:00Z'),
      status: 'verified' as const,
    };
    const result = evaluateClaim(await traceFor('verified.test'), stale, NOW);
    expect(result.status).toBe('verified');
  });
});

describe('tokenHasRunOut', () => {
  const RAN_OUT = new Date('2026-09-01T00:00:00Z');

  it('is the answer for a claim still trying to prove itself', () => {
    expect(tokenHasRunOut({ expiresAt: RAN_OUT, status: 'pending' }, NOW)).toBe(true);
    expect(tokenHasRunOut({ expiresAt: RAN_OUT, status: 'revoked' }, NOW)).toBe(true);
  });

  it('is never the answer for a claim that holds its name', () => {
    for (const status of ['verified', 'at_risk', 'contested'] as const) {
      expect(tokenHasRunOut({ expiresAt: RAN_OUT, status }, NOW)).toBe(false);
    }
  });
});

describe('shouldMarkVerified', () => {
  const found = { status: 'verified', record: 'r', answeredBy: 'ns1.example.com' } as const;
  const missed = {
    status: 'failed',
    reason: { code: 'no_txt_at_name', queriedName: 'x' },
  } as const;

  it('writes only when a pending claim was proved', () => {
    expect(shouldMarkVerified({ status: 'pending' }, found)).toBe(true);
    expect(shouldMarkVerified({ status: 'pending' }, missed)).toBe(false);
  });

  // A claim that already holds its name is already verified, and a record still sitting in a zone
  // does not bring a revoked one back.
  it('leaves every other status alone', () => {
    expect(shouldMarkVerified({ status: 'verified' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'at_risk' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'contested' }, found)).toBe(false);
    expect(shouldMarkVerified({ status: 'revoked' }, found)).toBe(false);
  });
});

/**
 * Which failures are allowed to move a name the account holds. The decision in this slice, so it
 * is a pure function with a test rather than a condition inside a write.
 */
describe('provesRecordGone', () => {
  // The nameservers answered and this claim's record was not in what they returned.
  const GONE: FailureReason[] = [
    { code: 'record_not_found', queriedName: 'x', nameservers: [], negativeTtlSeconds: null },
    { code: 'no_txt_at_name', queriedName: 'x' },
    { code: 'appended_zone_suspected', queriedName: 'x', foundAt: 'x.example.com' },
    { code: 'value_mismatch', expected: 'a', found: ['b'] },
  ];

  // A view of DNS that failed rather than a zone that changed. From one vantage point a timeout is
  // the weakest signal this product has. `token_expired` is decided from the row before any query.
  const PROVES_NOTHING: FailureReason[] = [
    { code: 'nameservers_unreachable', attempted: ['ns1.example.com'], timeoutMs: 2000 },
    { code: 'zone_not_found', walked: ['example.com'] },
    { code: 'token_expired', expiredAt: new Date('2026-09-01T00:00:00Z') },
  ];

  it.each(GONE)('$code proves the record is gone', (reason) => {
    expect(provesRecordGone(reason)).toBe(true);
  });

  it.each(PROVES_NOTHING)('$code proves nothing about the record', (reason) => {
    expect(provesRecordGone(reason)).toBe(false);
  });

  /**
   * The type checker forces this to name every code, and the assertion below forces every code to
   * be in one of the two lists. A reason added to the union fails the build here and then fails
   * this test until somebody decides whether it should take a name off an account.
   */
  const EVERY_CODE: Record<FailureReason['code'], true> = {
    record_not_found: true,
    no_txt_at_name: true,
    appended_zone_suspected: true,
    value_mismatch: true,
    token_expired: true,
    nameservers_unreachable: true,
    zone_not_found: true,
  };

  it('sorts every reason in the union into one side or the other', () => {
    const sorted = [...GONE, ...PROVES_NOTHING].map((reason) => reason.code);
    expect(new Set(sorted)).toEqual(new Set(Object.keys(EVERY_CODE)));
  });
});

describe('shouldMarkAtRisk', () => {
  const gone: CheckResult = {
    status: 'failed',
    reason: {
      code: 'record_not_found',
      queriedName: 'x',
      nameservers: [],
      negativeTtlSeconds: null,
    },
  };
  const silent: CheckResult = {
    status: 'failed',
    reason: { code: 'nameservers_unreachable', attempted: ['ns1.example.com'], timeoutMs: 2000 },
  };
  const found: CheckResult = { status: 'verified', record: 'r', answeredBy: 'ns1.example.com' };

  it('moves a verified claim whose record is gone', () => {
    expect(shouldMarkAtRisk({ status: 'verified' }, gone)).toBe(true);
  });

  it('leaves a verified claim alone when the nameservers said nothing', () => {
    expect(shouldMarkAtRisk({ status: 'verified' }, silent)).toBe(false);
  });

  it('leaves a verified claim alone when the check found the record', () => {
    expect(shouldMarkAtRisk({ status: 'verified' }, found)).toBe(false);
  });

  /**
   * `contested` holds its name too, and it carries a challenge nothing can resolve until transfers
   * exist, so a check has no business moving it. `at_risk` is already there, and the stamp belongs
   * to the first failure rather than to every check after it.
   */
  it.each(['pending', 'at_risk', 'contested', 'revoked'] as const)(
    'has nothing to write about a %s claim',
    (status) => {
      expect(shouldMarkAtRisk({ status }, gone)).toBe(false);
    },
  );
});

const mismatch: CheckResult = {
  status: 'failed',
  reason: { code: 'value_mismatch', expected: 'want', found: ['other'] },
};
const waiting: CheckResult = {
  status: 'failed',
  reason: { code: 'record_not_found', queriedName: 'x', nameservers: [], negativeTtlSeconds: null },
};
const proved: CheckResult = { status: 'verified', record: 'r', answeredBy: 'ns1.example.com' };
const WRONG_REASONS: FailureReason[] = [
  { code: 'no_txt_at_name', queriedName: 'x' },
  { code: 'appended_zone_suspected', queriedName: 'x', foundAt: 'x.x' },
  { code: 'value_mismatch', expected: 'want', found: ['other'] },
];
const NOT_WRONG_REASONS: FailureReason[] = [
  { code: 'record_not_found', queriedName: 'x', nameservers: [], negativeTtlSeconds: null },
  { code: 'nameservers_unreachable', attempted: ['ns1'], timeoutMs: 2000 },
  { code: 'zone_not_found', walked: ['x'] },
  { code: 'token_expired', expiredAt: new Date() },
];

describe('needsUserAction', () => {
  it('is true only when a wrong record is at the name', () => {
    for (const reason of WRONG_REASONS) {
      expect(needsUserAction(reason)).toBe(true);
    }
  });
  it('is false for nothing there, an unreachable zone, a missing delegation and an expired token', () => {
    for (const reason of NOT_WRONG_REASONS) {
      expect(needsUserAction(reason)).toBe(false);
    }
  });
});

describe('shouldFlagAction', () => {
  it('flags a pending claim with a wrong record when the flag is not already set', () => {
    expect(shouldFlagAction({ status: 'pending', actionNeededSince: null }, mismatch)).toBe(true);
  });
  it('does not flag again when the flag is already set, so the stamp stays at the first failure', () => {
    expect(shouldFlagAction({ status: 'pending', actionNeededSince: new Date() }, mismatch)).toBe(
      false,
    );
  });
  it('does not flag a waiting failure or a verified claim', () => {
    expect(shouldFlagAction({ status: 'pending', actionNeededSince: null }, waiting)).toBe(false);
    expect(shouldFlagAction({ status: 'pending', actionNeededSince: null }, proved)).toBe(false);
  });
  it('does not flag a claim that is not pending', () => {
    expect(shouldFlagAction({ status: 'verified', actionNeededSince: null }, mismatch)).toBe(false);
  });
});

describe('shouldClearAction', () => {
  it('clears a flagged pending claim once the wrong record is gone', () => {
    expect(shouldClearAction({ status: 'pending', actionNeededSince: new Date() }, waiting)).toBe(
      true,
    );
    expect(shouldClearAction({ status: 'pending', actionNeededSince: new Date() }, proved)).toBe(
      true,
    );
  });
  it('keeps the flag while a wrong record is still there', () => {
    expect(shouldClearAction({ status: 'pending', actionNeededSince: new Date() }, mismatch)).toBe(
      false,
    );
  });
  it('does nothing when there was no flag to clear', () => {
    expect(shouldClearAction({ status: 'pending', actionNeededSince: null }, waiting)).toBe(false);
  });
});

describe('shouldMarkRecovered', () => {
  const found: CheckResult = { status: 'verified', record: 'r', answeredBy: 'ns1.example.com' };

  it('takes an at risk claim back when the record answers again', () => {
    expect(shouldMarkRecovered({ status: 'at_risk' }, found)).toBe(true);
  });

  it.each(['pending', 'verified', 'contested', 'revoked'] as const)(
    'has nothing to write about a %s claim',
    (status) => {
      expect(shouldMarkRecovered({ status }, found)).toBe(false);
    },
  );
});

describe('claimAfterCheck', () => {
  const PENDING = { status: 'pending', verifiedAt: null } as const;
  const AT = new Date('2026-09-14T12:00:00Z');
  const WAITING: CheckResult = {
    status: 'failed',
    reason: { code: 'nameservers_unreachable', attempted: ['ns1.example.com'], timeoutMs: 2000 },
  };
  const WRONG: CheckResult = {
    status: 'failed',
    reason: { code: 'value_mismatch', expected: 'domainclaim-token=A expiry=Z', found: ['other'] },
  };

  it('moves the claim only when the write moved the row', () => {
    expect(claimAfterCheck(PENDING, 'verified', AT, WAITING)).toEqual({
      status: 'verified',
      verifiedAt: AT,
      provedButHeld: false,
      recovered: false,
      actionNeeded: false,
    });
  });

  it('leaves the claim where it was when no write was attempted', () => {
    expect(claimAfterCheck(PENDING, null, AT, WAITING)).toEqual({
      status: 'pending',
      verifiedAt: null,
      provedButHeld: false,
      recovered: false,
      actionNeeded: false,
    });
  });

  // The update can hit the partial unique index, which means another account verified the same
  // name between this claim being created and this check landing.
  it('reports control proved against a name another account holds', () => {
    expect(claimAfterCheck(PENDING, 'held_by_another', AT, WAITING)).toEqual({
      status: 'pending',
      verifiedAt: null,
      provedButHeld: true,
      recovered: false,
      actionNeeded: false,
    });
  });

  // The check saying verified is an observation. A failed write means the row did not move, so the
  // screen should not claim it did.
  it('does not promote a claim whose write failed', () => {
    expect(claimAfterCheck(PENDING, 'unavailable', AT, WAITING).status).toBe('pending');
  });

  /**
   * The name has been held since it was first proved. Stamping `at` here would report a name held
   * since March as proved a moment ago, on the status line and in the last step of the chain.
   */
  it('recovers without moving the date the name was proved', () => {
    const earlier = new Date('2026-09-01T09:00:00Z');
    const risk = { status: 'at_risk', verifiedAt: earlier } as const;
    expect(claimAfterCheck(risk, 'recovered', AT, WAITING)).toEqual({
      status: 'verified',
      verifiedAt: earlier,
      provedButHeld: false,
      recovered: true,
      actionNeeded: false,
    });
  });

  it('moves a held claim to at risk and leaves its date alone', () => {
    const earlier = new Date('2026-09-01T09:00:00Z');
    const held = { status: 'verified', verifiedAt: earlier } as const;
    expect(claimAfterCheck(held, 'at_risk', AT, WAITING)).toEqual({
      status: 'at_risk',
      verifiedAt: earlier,
      provedButHeld: false,
      recovered: false,
      actionNeeded: false,
    });
  });

  // The statement is conditional on the status the check read, so a second tab or a reload can
  // leave it matching nothing. The row is where it was, which is what the screen says.
  it('leaves the claim where it was when the write moved no row', () => {
    const held = { status: 'verified', verifiedAt: AT } as const;
    expect(claimAfterCheck(held, 'unchanged', AT, WAITING).status).toBe('verified');
    expect(claimAfterCheck(held, 'unchanged', AT, WAITING).recovered).toBe(false);
  });

  it('keeps the date a held claim already carries', () => {
    const earlier = new Date('2026-09-01T09:00:00Z');
    const held = { status: 'verified', verifiedAt: earlier } as const;
    expect(claimAfterCheck(held, null, AT, WAITING).verifiedAt).toBe(earlier);
  });
  // A pending claim whose check finds a wrong record is the person's move. The pill reads it from
  // the live result, so it is right even under a reload where the flag is already stored.
  it('reports action needed when a pending check finds a wrong record', () => {
    const after = claimAfterCheck(PENDING, 'action_needed', AT, WRONG);
    expect(after.status).toBe('pending');
    expect(after.actionNeeded).toBe(true);
  });
  it('does not report action needed while a pending claim is only waiting', () => {
    expect(claimAfterCheck(PENDING, null, AT, WAITING).actionNeeded).toBe(false);
  });
});
