// src/lib/claims/messages.test.ts
import { describe, expect, it } from 'vitest';
import { SUGGESTED_TTL_SECONDS, TOKEN_TTL_DAYS } from '@/lib/claims/config';
import { claimCopy, describeFailure, formatWhen } from '@/lib/claims/messages';
import type { FailureReason } from '@/lib/claims/state';
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
  { code: 'value_mismatch', expected: 'domainclaim-token=A expiry=Z', found: ['v=spf1 ~all'] },
  { code: 'token_expired', expiredAt: new Date('2026-09-01T00:00:00Z') },
  { code: 'nameservers_unreachable', attempted: ['ns1.example.com'], timeoutMs: 2000 },
  { code: 'zone_not_found', walked: [HOST, NAME] },
];

const everyString: string[] = [
  claimCopy.create.submit(NAME),
  ...Object.values(claimCopy.create.tooMany),
  ...Object.values(claimCopy.create.unavailable),
  ...Object.values(claimCopy.create.invalid),
  ...Object.values(claimCopy.demo),
  claimCopy.record.heading,
  claimCopy.record.intro(NAME),
  claimCopy.record.hostLabel,
  claimCopy.record.hostHint,
  claimCopy.record.fullNameLabel,
  claimCopy.record.fullNameHint,
  claimCopy.record.typeLabel,
  claimCopy.record.valueLabel,
  claimCopy.record.valueHint,
  claimCopy.record.ttlLabel,
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
  claimCopy.check.verifiedTitle,
  claimCopy.check.verifiedDescription('ns1.example.com', WHEN),
  claimCopy.check.keepRecord,
  claimCopy.check.stillHeld.title,
  claimCopy.check.stillHeld.description(NAME),
  claimCopy.check.stillHeld.action,
  ...Object.values(claimCopy.check.provedButHeld),
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

  it('says the panel appends the domain at the host field, where it can be acted on', () => {
    expect(claimCopy.record.hostHint.toLowerCase()).toContain('panel');
    expect(claimCopy.record.intro(NAME).toLowerCase()).not.toContain('panel');
  });

  it('states the TTL consequence at the TTL field and nowhere earlier', () => {
    expect(claimCopy.record.ttlHint).toContain(String(SUGGESTED_TTL_SECONDS));
    expect(claimCopy.record.intro(NAME)).not.toContain(String(SUGGESTED_TTL_SECONDS));
    expect(claimCopy.record.hostHint).not.toContain(String(SUGGESTED_TTL_SECONDS));
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
    const text = claimCopy.check.stillHeld.description(NAME).toLowerCase();
    expect(text).toContain('still held');
    expect(text).toContain(NAME);
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
    expect(message.description).toContain('2000');
  });
});
