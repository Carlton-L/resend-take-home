// src/lib/domain/messages.test.ts
import { describe, expect, it } from 'vitest';
import { findBannedPhrases } from '@/lib/copy/rules';
import { describeChange, describeDomainInputError } from '@/lib/domain/messages';
import type { DomainInputError, NormalizationChange } from '@/lib/domain/normalize';

/**
 * Keyed by code, so a new error code fails to compile until it has a sample here and a message in
 * the module. That compile failure is the point of this file; the assertions only check that the
 * strings that come back are usable.
 */
const everyError: Record<DomainInputError['code'], DomainInputError> = {
  empty: { code: 'empty' },
  input_too_long: { code: 'input_too_long', length: 5000, max: 2048 },
  email_address: {
    code: 'email_address',
    input: 'carlton@protonmail.com',
    domainPart: 'protonmail.com',
  },
  unparseable: { code: 'unparseable', input: '%%%', name: '%%%' },
  is_ip_address: { code: 'is_ip_address', input: '192.0.2.1', name: '192.0.2.1' },
  leading_dot: { code: 'leading_dot', name: '.com' },
  double_dot: { code: 'double_dot', name: 'example..com' },
  label_leading_hyphen: {
    code: 'label_leading_hyphen',
    name: 'example.-bad.com',
    labelIndex: 1,
    label: '-bad',
  },
  label_trailing_hyphen: {
    code: 'label_trailing_hyphen',
    name: 'example.bad-.com',
    labelIndex: 1,
    label: 'bad-',
  },
  label_too_long: {
    code: 'label_too_long',
    name: `${'a'.repeat(64)}.com`,
    labelIndex: 0,
    label: 'a'.repeat(64),
    max: 63,
  },
  name_too_long: { code: 'name_too_long', name: 'a.com', length: 300, max: 253 },
  special_use_name: { code: 'special_use_name', name: 'localhost', suffix: 'localhost' },
  single_label: { code: 'single_label', input: 'mycompany', name: 'mycompany' },
  is_public_suffix: { code: 'is_public_suffix', name: 'co.uk', suffix: 'co.uk' },
  unknown_suffix: { code: 'unknown_suffix', name: '192.0.2.carlton', suffix: 'carlton' },
};

const everyChange: Record<NormalizationChange['kind'], NormalizationChange> = {
  trimmed: { kind: 'trimmed' },
  removed_control_characters: { kind: 'removed_control_characters', count: 2 },
  lowercased: { kind: 'lowercased', from: 'WWW.Example.com' },
  removed_scheme: { kind: 'removed_scheme', removed: 'https://' },
  removed_path: { kind: 'removed_path', removed: '/pricing' },
  removed_credentials: { kind: 'removed_credentials' },
  removed_port: { kind: 'removed_port', removed: ':8080' },
  removed_trailing_dot: { kind: 'removed_trailing_dot' },
  converted_to_punycode: { kind: 'converted_to_punycode', from: 'münchen.de' },
  normalized_by_parser: { kind: 'normalized_by_parser', from: 'exa%6dple.com' },
};

const errors = Object.values(everyError);
const changes = Object.values(everyChange);

describe('describeDomainInputError', () => {
  it('covers every error code', () => {
    expect(errors).toHaveLength(15);
  });

  it.each(errors)('gives $code a title, a description and one action', (error) => {
    const message = describeDomainInputError(error);
    expect(message.title.length).toBeGreaterThan(0);
    expect(message.description.length).toBeGreaterThan(0);
    expect(message.action.length).toBeGreaterThan(0);
  });

  it.each(errors)('ends $code with a next action written as a sentence', (error) => {
    const { action } = describeDomainInputError(error);
    expect(action.endsWith('.')).toBe(true);
    expect(action[0]).toBe(action[0]?.toUpperCase());
  });

  it('marks the section at fault so the whole name can be shown around it', () => {
    const message = describeDomainInputError(everyError.label_leading_hyphen);
    expect(message.subject).toEqual({
      kind: 'marked_name',
      name: 'example.-bad.com',
      labelIndex: 1,
    });
  });

  it('talks about the reduced name once a URL has been cut down to one', () => {
    const message = describeDomainInputError({
      code: 'single_label',
      input: 'http://localhost:3000/claim',
      name: 'mycompany',
    });
    expect(message.subject).toEqual({ kind: 'text', value: 'mycompany' });
    expect(message.description).toContain('mycompany');
  });

  it('offers the domain part of an email rather than applying it', () => {
    const message = describeDomainInputError(everyError.email_address);
    expect(message.suggestion).toBe('protonmail.com');
    expect(message.description).toContain('protonmail.com');
  });

  it('leaves every other failure without a suggestion', () => {
    const withSuggestions = errors
      .map(describeDomainInputError)
      .filter((message) => message.suggestion !== null);
    expect(withSuggestions).toHaveLength(1);
  });

  it('names the suffix in the public suffix refusal, so the copy is about their domain', () => {
    const message = describeDomainInputError({
      code: 'is_public_suffix',
      name: 'co.uk',
      suffix: 'co.uk',
    });
    expect(message.title).toContain('co.uk');
    expect(message.description).toContain('co.uk');
    expect(message.action).toContain('co.uk');
  });

  it('quotes the input back in the catch-all, which is all it can say for certain', () => {
    const message = describeDomainInputError({
      code: 'unparseable',
      input: 'not a domain',
      name: 'not a domain',
    });
    expect(message.subject).toEqual({ kind: 'text', value: 'not a domain' });
  });
});

describe('describeChange', () => {
  it('covers every change kind', () => {
    expect(changes).toHaveLength(10);
  });

  it.each(changes)('gives $kind a summary', (change) => {
    expect(describeChange(change).summary.length).toBeGreaterThan(0);
  });

  it('explains punycode, which is the only term here a user will not know', () => {
    const described = describeChange({ kind: 'converted_to_punycode', from: 'münchen.de' });
    expect(described.value).toBe('münchen.de');
    expect(described.detail).not.toBeNull();
    expect(described.detail).toContain('punycode');
  });

  it('agrees with itself on plurals', () => {
    expect(describeChange({ kind: 'removed_control_characters', count: 1 }).summary).toContain(
      '1 line break or tab',
    );
    expect(describeChange({ kind: 'removed_control_characters', count: 3 }).summary).toContain(
      '3 line breaks or tabs',
    );
  });
});

describe('copy rules', () => {
  const subjectText = (error: DomainInputError) => {
    const { subject } = describeDomainInputError(error);
    if (subject === null) {
      return '';
    }
    return subject.kind === 'text' ? subject.value : subject.name;
  };

  const strings = [
    ...errors.flatMap((error) => {
      const message = describeDomainInputError(error);
      return [message.title, subjectText(error), message.description, message.action];
    }),
    ...changes.flatMap((change) => {
      const described = describeChange(change);
      return [described.summary, described.detail ?? ''];
    }),
  ];

  // The list itself lives in src/lib/copy/rules.ts, so every screen is held to the same one.
  it('follows the copy rules', () => {
    expect(findBannedPhrases(strings)).toEqual([]);
  });
});
