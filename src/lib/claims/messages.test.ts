// src/lib/claims/messages.test.ts
import { describe, expect, it } from 'vitest';
import { TOKEN_TTL_DAYS } from '@/lib/claims/config';
import {
  claimCopy,
  describeClaimRow,
  describeFailure,
  describeStatus,
  formatDeadline,
  formatMinutes,
  formatSince,
  formatTime,
  formatWhen,
} from '@/lib/claims/messages';
import { CLAIM_STATUSES, type FailureReason } from '@/lib/claims/state';
import { appCopy } from '@/lib/copy/app';
import { findBannedPhrases } from '@/lib/copy/rules';
import { testNames } from '@/lib/dns/testNames';

const NAME = 'example.com';
const HOST = '_domainclaim-challenge.example.com';
const WHEN = formatWhen(new Date('2026-09-20T18:42:07Z'));

/** One of every reason, so the copy for each is exercised rather than only its type. */
const EVERY_REASON: FailureReason[] = [
  {
    code: 'record_not_found',
    queriedName: HOST,
    nameservers: ['ns1.example.com'],
    negativeTtlSeconds: 300,
  },
  { code: 'record_not_found', queriedName: HOST, nameservers: [], negativeTtlSeconds: null },
  { code: 'no_txt_at_name', queriedName: HOST },
  { code: 'appended_zone_suspected', queriedName: HOST, foundAt: `${HOST}.example.com` },
  { code: 'value_mismatch', expected: 'domainclaim-token=A expiry=Z', found: ['v=spf1 ~all'] },
  { code: 'token_expired', expiredAt: new Date('2026-09-01T00:00:00Z') },
  { code: 'nameservers_unreachable', attempted: ['ns1.example.com'], timeoutMs: 2000 },
  { code: 'zone_not_found', walked: [HOST, NAME] },
];

const everyString: string[] = [
  claimCopy.create.submit(NAME),
  claimCopy.create.nameToClaim,
  claimCopy.create.submitEmpty,
  claimCopy.create.empty,
  ...Object.values(claimCopy.create.tooMany),
  ...Object.values(claimCopy.create.unavailable),
  ...Object.values(claimCopy.create.invalid),
  claimCopy.demo.heading,
  claimCopy.demo.description,
  ...Object.values(claimCopy.demo.columns),
  ...Object.values(claimCopy.demo.outcome).flatMap((outcome) => [outcome.label, outcome.line]),
  claimCopy.list.nav,
  claimCopy.list.heading,
  claimCopy.list.intro,
  claimCopy.list.claim,
  claimCopy.list.refresh,
  claimCopy.list.filter.label,
  claimCopy.list.filter.all,
  claimCopy.list.filter.none('Pending'),
  ...Object.values(claimCopy.list.sort),
  claimCopy.list.attention.count(1),
  claimCopy.list.attention.count(2),
  claimCopy.list.attention.show,
  claimCopy.list.refreshing,
  claimCopy.list.actions(NAME),
  claimCopy.list.open,
  ...Object.values(claimCopy.list.empty),
  claimCopy.status.expired.label,
  claimCopy.status.expired.line,
  claimCopy.record.heading,
  claimCopy.record.headingHeld,
  claimCopy.record.intro(NAME),
  claimCopy.record.typeLabel,
  claimCopy.record.nameLabel,
  claimCopy.record.nameHint,
  claimCopy.record.fullNameSummary,
  claimCopy.record.fullNameHint,
  claimCopy.record.valueLabel,
  claimCopy.record.valueHint,
  claimCopy.record.ttlLabel,
  claimCopy.record.ttlValue,
  claimCopy.record.ttlHint,
  claimCopy.record.copy,
  claimCopy.record.copied,
  claimCopy.record.expiry(WHEN),
  claimCopy.record.heldExpiry(WHEN),
  claimCopy.record.existing,
  claimCopy.record.reissued,
  claimCopy.record.challenger(NAME),
  claimCopy.record.provider.recognized('Google'),
  claimCopy.record.provider.unrecognized('some-small-host.com'),
  ...Object.values(claimCopy.loading),
  claimCopy.check.running,
  claimCopy.check.now,
  claimCopy.check.checking,
  claimCopy.check.checkedAt('just now'),
  claimCopy.check.waiting('4 minutes ago'),
  claimCopy.check.stopped('15 minutes'),
  ...Object.values(claimCopy.check.limited),
  ...Object.values(claimCopy.check.unavailable),
  ...Object.values(claimCopy.check.offline),
  ...Object.values(claimCopy.check.signedOut),
  ...Object.values(claimCopy.check.missing),
  claimCopy.check.keepRecord.lead,
  claimCopy.check.keepRecord.rest,
  claimCopy.steps.heading,
  claimCopy.steps.answered(3),
  claimCopy.steps.notReached,
  ...Object.values(claimCopy.steps.label),
  ...Object.values(claimCopy.steps.state),
  claimCopy.steps.zone.found('example.com', 4, 'Google'),
  claimCopy.steps.zone.foundUnnamed('example.com'),
  claimCopy.steps.zone.none,
  claimCopy.steps.zone.expired,
  claimCopy.steps.nameservers.answered('ns1.example.com'),
  claimCopy.steps.nameservers.answeredUnnamed,
  claimCopy.steps.nameservers.silent,
  claimCopy.steps.record.found(2),
  claimCopy.steps.record.none,
  claimCopy.steps.record.gone,
  claimCopy.steps.record.wrongType,
  claimCopy.steps.record.appended,
  claimCopy.steps.token.matched('ns1.example.com'),
  claimCopy.steps.token.mismatch,
  claimCopy.steps.token.expired,
  claimCopy.steps.claim.alreadyHeld,
  claimCopy.steps.claim.notRecorded,
  claimCopy.steps.claim.heldByAnother,
  claimCopy.steps.summary(claimCopy.steps.summaryThrough),
  claimCopy.status.provedButHeld.label,
  claimCopy.status.provedButHeld.line,
  claimCopy.status.proved('ns1.example.com', WHEN),
  claimCopy.status.stillHeld,
  claimCopy.status.recovered('ns1.example.com'),
  claimCopy.status.atRisk.since(WHEN),
  claimCopy.status.actionNeeded.label,
  claimCopy.status.actionNeeded.line,
  claimCopy.status.actionNeeded.since(WHEN),
  ...Object.values(claimCopy.check.provedButHeld),
  ...CLAIM_STATUSES.flatMap((status) => {
    const message = describeStatus(status, new Date('2026-09-14T18:42:07Z'));
    return [message.label, message.line];
  }),
  ...Object.values(appCopy.notFound),
  ...Object.values(appCopy.unexpected),
  ...Object.values(appCopy.claimFailed),
  claimCopy.release.trigger,
  claimCopy.release.title,
  claimCopy.release.description(NAME),
  claimCopy.release.removeRecord(HOST),
  claimCopy.release.confirm,
  claimCopy.release.cancel,
  ...EVERY_REASON.flatMap((reason) => {
    const message = describeFailure(reason);
    return [message.title, message.description, message.action];
  }),
  // The same reasons said to someone whose claim already holds the name. One of them changes.
  ...EVERY_REASON.flatMap((reason) => {
    const message = describeFailure(reason, { held: true });
    return [message.title, message.description, message.action];
  }),
];

describe('claim copy', () => {
  it('names what it is doing while the browser posts the claim', () => {
    expect(claimCopy.create.submitting.length).toBeGreaterThan(0);
    expect(claimCopy.create.submitting).not.toBe(claimCopy.create.submitEmpty);
  });

  it('follows the copy rules', () => {
    expect(findBannedPhrases(everyString)).toEqual([]);
  });

  /**
   * When the check ran is now said beside the control that runs it again, which is the one place
   * on the screen where it can be acted on. Saying it twice would mean two strings that have to
   * agree with each other.
   */
  it('keeps the time out of the closed chain, where nothing can be done with it', () => {
    const line = claimCopy.steps.summary(claimCopy.steps.summaryThrough);
    expect(line).toBe(`${claimCopy.steps.summaryThrough}.`);
    expect(line.toLowerCase()).not.toContain('checked');
  });

  /**
   * The button is not the Verify button the RFC designed out, and the line beside it is what says
   * so: the product is going to ask again either way.
   */
  it('says another check is coming beside the button that asks now', () => {
    expect(claimCopy.check.waiting('just now').toLowerCase()).toContain('again');
    expect(claimCopy.check.now.toLowerCase()).toContain('now');
  });

  it('says a record that has gone is gone rather than not added yet', () => {
    const reason = EVERY_REASON[0];
    const held = describeFailure(reason, { held: true });
    const fresh = describeFailure(reason);
    expect(held.title.toLowerCase()).not.toContain('yet');
    expect(fresh.title.toLowerCase()).toContain('yet');
    expect(held.action).not.toBe(fresh.action);
  });

  // Every other reason means the same thing on a held claim, so the words should not move.
  it('leaves the reasons a held claim shares with a new one alone', () => {
    for (const reason of EVERY_REASON.filter((one) => one.code !== 'record_not_found')) {
      expect(describeFailure(reason, { held: true })).toEqual(describeFailure(reason));
    }
  });

  it('stops telling people to reload a page that checks on its own', () => {
    const actions = EVERY_REASON.map((reason) => describeFailure(reason).action.toLowerCase());
    expect(actions.filter((action) => action.includes('reload this page'))).toEqual([]);
  });

  it('says the panel appends the domain at the Name cell, where it can be acted on', () => {
    expect(claimCopy.record.nameHint.toLowerCase()).toContain('panel');
    expect(claimCopy.record.intro(NAME).toLowerCase()).not.toContain('panel');
  });

  // Squarespace offers TTL as a dropdown defaulting to 4 hrs, measured 2026-09-13, so a number
  // here is advice that cannot be followed on the one panel we have measured.
  it('gives TTL as an instruction rather than a number to copy', () => {
    expect(claimCopy.record.ttlValue).not.toMatch(/\d/);
    expect(claimCopy.record.ttlHint).not.toMatch(/\d/);
    expect(claimCopy.record.ttlValue.toLowerCase()).toContain('default');
  });

  it('offers the short name first and the full name as the alternative', () => {
    expect(claimCopy.record.nameHint.toLowerCase()).toContain('short form');
    expect(claimCopy.record.fullNameHint.toLowerCase()).toContain('exactly as typed');
  });

  // The full name is reached through a disclosure, so its summary has to describe the panel the
  // person is looking at rather than name the record form it reveals.
  it('opens the full name with the condition that calls for it', () => {
    expect(claimCopy.record.fullNameSummary.toLowerCase()).toContain('panel');
  });

  it('states the expiry beside the value that carries it', () => {
    expect(claimCopy.record.expiry(WHEN)).toContain(WHEN);
  });

  it('carries the claimed name on the button, so the confirmation is the name itself', () => {
    expect(claimCopy.create.submit(NAME)).toContain(NAME);
  });

  it('names the record to remove when a claim is released', () => {
    expect(claimCopy.release.removeRecord(HOST)).toContain(HOST);
  });

  it('says the record stays in place after verifying, because re-checks need it', () => {
    expect(claimCopy.check.keepRecord.lead.toLowerCase()).toContain('keep the txt record');
  });

  it('tells a reissued claim that the value it already published no longer matches', () => {
    expect(claimCopy.record.reissued.toLowerCase()).toContain('no longer matches');
  });

  it('warns a challenger before they edit their zone rather than after the check', () => {
    expect(claimCopy.record.challenger(NAME)).toContain(NAME);
    expect(claimCopy.record.challenger(NAME).toLowerCase()).toContain('another account');
  });

  it('tells a challenger who proved control that the record should stay', () => {
    expect(claimCopy.check.provedButHeld.action.toLowerCase()).toContain('leave the record');
  });

  // Without this the product tells someone to add a record they added weeks ago, while the
  // database still has the name as theirs.
  it('says a held name is still held when its record stops answering', () => {
    expect(claimCopy.status.stillHeld.toLowerCase()).toContain('no longer found');
  });

  // A label that is a statement can only be true, so it fights its own glyph on a step that is
  // waiting or wrong.
  it('labels steps rather than asserting their outcome', () => {
    for (const label of Object.values(claimCopy.steps.label)) {
      expect(label.toLowerCase()).not.toContain('found');
      expect(label).not.toContain('?');
    }
  });
});

describe('the demo list', () => {
  it('says what every scripted name does', () => {
    for (const name of testNames()) {
      expect(claimCopy.demo.outcome[name]).toBeDefined();
    }
  });
});

describe('formatTime', () => {
  // One locale and UTC for the same reason formatWhen has them: this string is produced on the
  // server and must not be re-derived differently in the browser.
  it('gives a time in UTC and no date', () => {
    const formatted = formatTime(new Date('2026-09-20T18:42:07Z'));
    expect(formatted).toBe('18:42 UTC');
    expect(formatted).not.toContain('September');
  });
});

describe('describeClaimRow', () => {
  const NOW = new Date('2026-09-14T12:00:00Z');
  const LIVE = new Date('2026-09-20T12:00:00Z');
  const RUN_OUT = new Date('2026-09-10T12:00:00Z');

  it.each(CLAIM_STATUSES)('%s has a label and a line', (status) => {
    const message = describeClaimRow(
      { status, verifiedAt: null, expiresAt: LIVE, failingSince: null, actionNeededSince: null },
      NOW,
    );
    expect(message.label.length).toBeGreaterThan(0);
    expect(message.line.length).toBeGreaterThan(0);
  });

  // The row is still `pending` in the database, and the enum has nowhere to put this. The list is
  // the only screen that will ever say it, since the record screen gets it from the check.
  it('reads a pending claim whose token has run out as expired', () => {
    const message = describeClaimRow(
      {
        status: 'pending',
        verifiedAt: null,
        expiresAt: RUN_OUT,
        failingSince: null,
        actionNeededSince: null,
      },
      NOW,
    );
    expect(message.label).toBe(claimCopy.status.expired.label);
    expect(message.tone).toBe('attention');
  });

  // A token expiry sitting in the past is normal on a claim that was proved, because verifying
  // does not clear it. Reading that as expired would put a marker on every name the account holds.
  it('leaves a claim that already holds its name alone, however old its token is', () => {
    for (const status of ['verified', 'at_risk', 'contested'] as const) {
      const message = describeClaimRow(
        {
          status,
          verifiedAt: new Date('2026-09-11T09:00:00Z'),
          expiresAt: RUN_OUT,
          failingSince: null,
          actionNeededSince: null,
        },
        NOW,
      );
      expect(message.label).not.toBe(claimCopy.status.expired.label);
    }
  });

  /**
   * The tone is the row's only marker, and attention means the next move is the person's. The same
   * rule that sorts the check steps, applied to what a row on its own can know: a pending claim
   * inside its window is waiting on a record being added, so it stays quiet.
   */
  it.each([
    ['pending', LIVE, 'neutral'],
    ['pending', RUN_OUT, 'attention'],
    ['verified', RUN_OUT, 'good'],
    ['at_risk', RUN_OUT, 'attention'],
    ['contested', RUN_OUT, 'attention'],
    ['revoked', RUN_OUT, 'neutral'],
  ] as const)('%s expiring %s asks for %s', (status, expiresAt, tone) => {
    expect(
      describeClaimRow(
        { status, verifiedAt: null, expiresAt, failingSince: null, actionNeededSince: null },
        NOW,
      ).tone,
    ).toBe(tone);
  });

  // A pending claim whose last check found a wrong record is the person's move, so the row reads
  // as attention with a since detail, the same shape as at risk.
  it('reads a pending claim with a wrong record as action needed', () => {
    const since = new Date('2026-09-16T02:00:00Z');
    const message = describeClaimRow(
      {
        status: 'pending',
        verifiedAt: null,
        expiresAt: LIVE,
        failingSince: null,
        actionNeededSince: since,
      },
      NOW,
    );
    expect(message.label).toBe(claimCopy.status.actionNeeded.label);
    expect(message.tone).toBe('attention');
    expect(message.detail).toBe(claimCopy.status.actionNeeded.since(formatWhen(since)));
  });

  // Expiry wins: an expired claim needs a new token before the record it points at matters, so a
  // flag set on it does not change the word.
  it('reads an expired claim as expired even with the action flag set', () => {
    const message = describeClaimRow(
      {
        status: 'pending',
        verifiedAt: null,
        expiresAt: RUN_OUT,
        failingSince: null,
        actionNeededSince: new Date('2026-09-16T02:00:00Z'),
      },
      NOW,
    );
    expect(message.label).toBe(claimCopy.status.expired.label);
  });

  // A fresh pending claim with no flag stays neutral, which is the waiting case the list is quiet
  // about on purpose.
  it('leaves a fresh pending claim neutral when no wrong record was found', () => {
    const message = describeClaimRow(
      {
        status: 'pending',
        verifiedAt: null,
        expiresAt: LIVE,
        failingSince: null,
        actionNeededSince: null,
      },
      NOW,
    );
    expect(message.tone).toBe('neutral');
  });

  /**
   * The one detail a row carries. How long a name has been failing is what the status word leaves
   * out, and it is the number the grace window will count from once there is a schedule to run it.
   */
  it('says how long an at risk name has been failing', () => {
    const failingSince = new Date('2026-09-12T08:31:00Z');
    const message = describeClaimRow(
      {
        status: 'at_risk',
        verifiedAt: new Date('2026-09-01T09:00:00Z'),
        expiresAt: LIVE,
        failingSince,
        actionNeededSince: null,
      },
      NOW,
    );
    expect(message.detail).toBe(claimCopy.status.atRisk.since(formatWhen(failingSince)));
    expect(message.detail).toContain('12 September 2026');
    // The same UTC suffix as every other date here. Without it a reader a couple of hours either
    // side of midnight takes the date as local and lands a day out.
    expect(message.detail).toContain('UTC');
  });

  // The column is null on every other status, and on an at-risk row written before it existed.
  it.each(CLAIM_STATUSES)('%s carries no detail without a date to put in it', (status) => {
    const message = describeClaimRow(
      { status, verifiedAt: null, expiresAt: LIVE, failingSince: null, actionNeededSince: null },
      NOW,
    );
    expect(message.detail).toBeNull();
  });

  it('carries no detail on a status that is not at risk', () => {
    const message = describeClaimRow(
      {
        status: 'verified',
        verifiedAt: new Date('2026-09-01T09:00:00Z'),
        expiresAt: LIVE,
        failingSince: new Date('2026-09-12T08:31:00Z'),
        actionNeededSince: null,
      },
      NOW,
    );
    expect(message.detail).toBeNull();
  });
});

/**
 * Verifying does not clear `expires_at`, so a name held for longer than the token's seven days
 * carries an expiry in the past, and that date is in the record value being compared against the
 * panel. The check no longer stops on it, which is what made this line reachable.
 */
describe('the record expiry line', () => {
  it('says something different once the claim holds the name', () => {
    expect(claimCopy.record.heldExpiry(WHEN)).not.toBe(claimCopy.record.expiry(WHEN));
  });

  it('does not tell the holder of a name that the token is still good', () => {
    expect(claimCopy.record.heldExpiry(WHEN).toLowerCase()).not.toContain('is good until');
  });

  it('carries the date, since that is what is sitting in the record value', () => {
    expect(claimCopy.record.heldExpiry(WHEN)).toContain(WHEN);
  });
});

describe('describeFailure', () => {
  it.each(EVERY_REASON.map((reason) => [reason.code, reason] as const))(
    '%s ends in exactly one action',
    (_code, reason) => {
      const message = describeFailure(reason);
      expect(message.action.length).toBeGreaterThan(0);
      expect(message.action.split('. ').filter((part) => part.trim().length > 0)).toHaveLength(1);
    },
  );

  it.each(EVERY_REASON.map((reason) => [reason.code, reason] as const))(
    '%s says what went wrong and why',
    (_code, reason) => {
      const message = describeFailure(reason);
      expect(message.title.length).toBeGreaterThan(0);
      expect(message.description.length).toBeGreaterThan(0);
    },
  );

  it('names the negative cache window only when one was read', () => {
    const withWindow = describeFailure({
      code: 'record_not_found',
      queriedName: HOST,
      nameservers: [],
      negativeTtlSeconds: 300,
    });
    const without = describeFailure({
      code: 'record_not_found',
      queriedName: HOST,
      nameservers: [],
      negativeTtlSeconds: null,
    });
    expect(withWindow.description).toContain('300');
    expect(without.description).not.toContain('300');
  });

  // The worst reading of an action scoped to "that name" is "delete everything except this", which
  // on a zone apex would take out their mail. An action that could be read as destructive is not an
  // action this product prints.
  it('never tells anyone to remove records it did not name', () => {
    for (const reason of EVERY_REASON) {
      const action = describeFailure(reason).action.toLowerCase();
      if (action.includes('delete') || action.includes('remove')) {
        expect(action).toMatch(/that record|the cname/);
      }
      expect(action).not.toContain('only thing');
    }
  });

  it('does not read as a fault for the check that always misses', () => {
    const message = describeFailure({
      code: 'record_not_found',
      queriedName: HOST,
      nameservers: [],
      negativeTtlSeconds: null,
    });
    const blame = ['error', 'invalid', 'failed', 'you should have'];
    expect(blame.filter((word) => message.title.toLowerCase().includes(word))).toEqual([]);
  });

  it('states the token lifetime where an expired claim is reported', () => {
    const message = describeFailure({
      code: 'token_expired',
      expiredAt: new Date('2026-09-01T00:00:00Z'),
    });
    expect(message.description).toContain(String(TOKEN_TTL_DAYS));
  });

  // An action that says to replace a value and then makes the person select it by hand is half an
  // action. The value it names is the one thing on that panel that has to be copied exactly.
  it('offers the expected value to copy where the action says to use it', () => {
    const message = describeFailure({
      code: 'value_mismatch',
      expected: 'domainclaim-token=A expiry=Z',
      found: ['v=spf1 ~all'],
    });
    expect(message.copyable?.value).toBe('domainclaim-token=A expiry=Z');
  });

  it('offers nothing to copy where the action does not name a value', () => {
    const message = describeFailure({ code: 'no_txt_at_name', queriedName: HOST });
    expect(message.copyable).toBeNull();
  });

  it('shows the values found rather than only saying they differ', () => {
    const message = describeFailure({
      code: 'value_mismatch',
      expected: 'domainclaim-token=A expiry=Z',
      found: ['v=spf1 ~all', 'domainclaim-token=B expiry=Z'],
    });
    expect(message.record?.values).toEqual(['v=spf1 ~all', 'domainclaim-token=B expiry=Z']);
  });

  it('names the deadline it gave up after, since a slow zone reads the same as a dead one', () => {
    const message = describeFailure({
      code: 'nameservers_unreachable',
      attempted: ['ns1.example.com'],
      timeoutMs: 2000,
    });
    expect(message.description).toContain('two seconds');
    expect(message.description).not.toContain('2000');
  });
});

/**
 * Shares its list of spelled numbers with `formatDeadline`, which is the trap: widening the list
 * for this function silently changed what a deadline of eleven seconds reads as. The two ranges
 * are one range on purpose, and these assertions are both ends of it.
 */
describe('formatMinutes', () => {
  it('spells a small whole number of minutes', () => {
    expect(formatMinutes(60_000)).toBe('one minute');
    expect(formatMinutes(2 * 60_000)).toBe('two minutes');
  });

  it('falls back to digits above the spelled range', () => {
    expect(formatMinutes(15 * 60_000)).toBe('15 minutes');
    expect(formatMinutes(30 * 60_000)).toBe('30 minutes');
  });
});

/**
 * A relative time is only honest because the client re-renders it. These are the buckets, and they
 * are coarse on purpose: a second by second count is motion on a page where nothing is happening.
 */
describe('formatSince', () => {
  it('reads as just now for the first three quarters of a minute', () => {
    expect(formatSince(0)).toBe('just now');
    expect(formatSince(44_000)).toBe('just now');
  });

  it('rounds to whole minutes after that', () => {
    expect(formatSince(45_000)).toBe('a minute ago');
    expect(formatSince(60_000)).toBe('a minute ago');
    expect(formatSince(4 * 60_000)).toBe('4 minutes ago');
  });
});

describe('formatDeadline', () => {
  it('spells a small whole number of seconds', () => {
    expect(formatDeadline(1000)).toBe('one second');
    expect(formatDeadline(2000)).toBe('two seconds');
    expect(formatDeadline(10000)).toBe('ten seconds');
  });

  it('falls back to digits outside that range', () => {
    expect(formatDeadline(11000)).toBe('11 seconds');
    expect(formatDeadline(1500)).toBe('1.5 seconds');
    expect(formatDeadline(500)).toBe('0.5 seconds');
  });
});

describe('describeStatus', () => {
  it.each(CLAIM_STATUSES)('%s says what state the claim is in', (status) => {
    const message = describeStatus(status, new Date('2026-09-14T18:42:07Z'));
    expect(message.label.length).toBeGreaterThan(0);
    expect(message.line.length).toBeGreaterThan(0);
  });

  // The row carries verified_at, so a claim proved last week should not read as proved just now.
  it('dates a verified claim from the row', () => {
    const when = new Date('2026-09-14T18:42:07Z');
    expect(describeStatus('verified', when).line).toContain(formatWhen(when));
  });

  it('still says a verified claim is held when the row carries no date', () => {
    expect(describeStatus('verified', null).line.toLowerCase()).toContain(
      'verified for this account',
    );
  });

  // This is the line the friction log caught: the eyebrow said CLAIMING on a name already proved.
  it('does not describe a held claim as unproved', () => {
    expect(describeStatus('verified', null).line.toLowerCase()).not.toContain('not yet verified');
    expect(describeStatus('pending', null).line.toLowerCase()).toContain('not yet verified');
  });
});
