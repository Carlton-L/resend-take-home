// src/lib/claims/messages.test.ts
import { describe, expect, it } from 'vitest';
import { TOKEN_TTL_DAYS } from '@/lib/claims/config';
import {
  claimCopy,
  describeFailure,
  describeStatus,
  formatDeadline,
  formatWhen,
} from '@/lib/claims/messages';
import { CLAIM_STATUSES, type FailureReason } from '@/lib/claims/state';
import { appCopy } from '@/lib/copy/app';
import { findBannedPhrases } from '@/lib/copy/rules';

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
  ...Object.values(claimCopy.demo),
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
  claimCopy.record.existing,
  claimCopy.record.reissued,
  claimCopy.record.challenger(NAME),
  claimCopy.record.provider.recognized('Google'),
  claimCopy.record.provider.unrecognized('some-small-host.com'),
  claimCopy.check.running,
  claimCopy.check.keepRecord,
  claimCopy.steps.heading,
  claimCopy.steps.answered(3),
  claimCopy.steps.notReached,
  ...Object.values(claimCopy.steps.label),
  claimCopy.steps.zone.found('example.com', 4, 'Google'),
  claimCopy.steps.zone.foundUnnamed('example.com'),
  claimCopy.steps.zone.none,
  claimCopy.steps.zone.expired,
  claimCopy.steps.nameservers.answered('ns1.example.com'),
  claimCopy.steps.nameservers.answeredUnnamed,
  claimCopy.steps.nameservers.silent,
  claimCopy.steps.record.found(2),
  claimCopy.steps.record.none,
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
  ...Object.values(claimCopy.check.provedButHeld),
  ...CLAIM_STATUSES.flatMap((status) => {
    const message = describeStatus(status, new Date('2026-09-14T18:42:07Z'));
    return [message.label, message.line];
  }),
  ...Object.values(appCopy.notFound),
  ...Object.values(appCopy.unexpected),
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
];

describe('claim copy', () => {
  it('follows the copy rules', () => {
    expect(findBannedPhrases(everyString)).toEqual([]);
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
    expect(claimCopy.check.keepRecord.toLowerCase()).toContain('leave the record');
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
    expect(claimCopy.status.stillHeld.toLowerCase()).toContain('still holds the name');
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
    expect(describeStatus('verified', null).line.toLowerCase()).toContain('held by this account');
  });

  // This is the line the friction log caught: the eyebrow said CLAIMING on a name already proved.
  it('does not describe a held claim as unproved', () => {
    expect(describeStatus('verified', null).line.toLowerCase()).not.toContain('not been proved');
    expect(describeStatus('pending', null).line.toLowerCase()).toContain('not been proved');
  });
});
