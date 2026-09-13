// src/lib/domain/normalize.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeDomainInput } from '@/lib/domain/normalize';

const ok = (raw: string) => {
  const result = normalizeDomainInput(raw);
  if (!result.ok) {
    throw new Error(`expected ${raw} to normalize, got ${result.error.code}`);
  }
  return result.value;
};

const err = (raw: string) => {
  const result = normalizeDomainInput(raw);
  if (result.ok) {
    throw new Error(`expected ${raw} to be rejected, got ${result.value.name}`);
  }
  return result.error;
};

describe('normalizeDomainInput', () => {
  it('passes a clean apex domain through unchanged', () => {
    const value = ok('example.com');
    expect(value.name).toBe('example.com');
    expect(value.registrableDomain).toBe('example.com');
    expect(value.publicSuffix).toBe('com');
    expect(value.isApex).toBe(true);
    expect(value.changes).toEqual([]);
  });

  it('marks a subdomain as not an apex and keeps its registrable domain', () => {
    const value = ok('app.example.com');
    expect(value.name).toBe('app.example.com');
    expect(value.registrableDomain).toBe('example.com');
    expect(value.isApex).toBe(false);
  });

  it('trims and lowercases, recording both', () => {
    const value = ok('  Example.COM  ');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toEqual(['trimmed', 'lowercased']);
  });

  it('strips a pasted URL down to its host', () => {
    const value = ok('https://app.example.com/settings');
    expect(value.name).toBe('app.example.com');
    expect(value.changes.map((change) => change.kind)).toEqual(['removed_scheme', 'removed_path']);
  });

  it('strips credentials, path and port from a full URL', () => {
    const value = ok('https://user:pw@example.com:8443/x?y=1#z');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toEqual([
      'removed_scheme',
      'removed_path',
      'removed_credentials',
      'removed_port',
    ]);
  });

  it('keeps the host when an @ appears in the path', () => {
    const value = ok('example.com/a@b');
    expect(value.name).toBe('example.com');
  });

  it('removes a trailing dot', () => {
    const value = ok('example.com.');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toEqual(['removed_trailing_dot']);
  });

  it('converts an internationalized name to punycode', () => {
    const value = ok('münchen.de');
    expect(value.name).toBe('xn--mnchen-3ya.de');
    expect(value.changes.map((change) => change.kind)).toContain('converted_to_punycode');
  });

  it('keeps the original input alongside the normalized name', () => {
    const value = ok('  HTTPS://Example.com/path  ');
    expect(value.input).toBe('  HTTPS://Example.com/path  ');
    expect(value.name).toBe('example.com');
  });

  it('rejects empty input', () => {
    expect(err('').code).toBe('empty');
    expect(err('   ').code).toBe('empty');
    expect(err('https://').code).toBe('empty');
  });

  it('rejects an ICANN public suffix', () => {
    const error = err('co.uk');
    expect(error.code).toBe('is_public_suffix');
  });

  it('rejects a private public-suffix entry', () => {
    expect(err('github.io').code).toBe('is_public_suffix');
  });

  it('accepts a name registered under a private suffix', () => {
    const value = ok('someone.github.io');
    expect(value.registrableDomain).toBe('someone.github.io');
    expect(value.publicSuffix).toBe('github.io');
  });

  it('rejects IP addresses', () => {
    expect(err('192.168.1.1').code).toBe('is_ip_address');
    expect(err('https://[::1]').code).toBe('is_ip_address');
  });

  it('rejects a single label', () => {
    expect(err('mycompany').code).toBe('single_label');
  });

  it('rejects a label over 63 characters', () => {
    const error = err(`${'a'.repeat(64)}.com`);
    expect(error.code).toBe('label_too_long');
  });

  it('rejects a name over 253 characters', () => {
    const long = `${Array.from({ length: 5 }, () => 'a'.repeat(60)).join('.')}.com`;
    const error = err(long);
    expect(error.code).toBe('name_too_long');
  });

  it('rejects input the URL parser cannot read as a host', () => {
    expect(err('exa mple.com').code).toBe('unparseable');
  });
  it('rejects input larger than the cap before doing any parsing work', () => {
    const error = err('a'.repeat(3000));
    expect(error.code).toBe('input_too_long');
  });

  it('strips tab and newline characters and says so', () => {
    const value = ok('exam\nple.com');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toContain('removed_control_characters');
  });

  it('treats a backslash as a path separator, as URL parsers do', () => {
    const value = ok('example.com\\settings');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toContain('removed_path');
  });

  it('separates a leading dot from an interior double dot', () => {
    // Different mistakes with different repairs. Removing the dot from '.com' would only
    // produce the next error.
    expect(err('a..b.com').code).toBe('double_dot');
    expect(err('.example.com').code).toBe('leading_dot');
    expect(err('.com').code).toBe('leading_dot');
  });

  it('rejects a label starting with a hyphen', () => {
    expect(err('-example.com').code).toBe('label_leading_hyphen');
  });

  it('rejects a label ending with a hyphen', () => {
    expect(err('example-.com').code).toBe('label_trailing_hyphen');
  });

  it('handles a multi-label public suffix', () => {
    const value = ok('example.co.uk');
    expect(value.registrableDomain).toBe('example.co.uk');
    expect(value.publicSuffix).toBe('co.uk');
    expect(value.isApex).toBe(true);
  });

  it('handles a subdomain under a multi-label public suffix', () => {
    const value = ok('app.example.co.uk');
    expect(value.registrableDomain).toBe('example.co.uk');
    expect(value.isApex).toBe(false);
  });

  it('leaves an already-punycode name untouched', () => {
    const value = ok('xn--mnchen-3ya.de');
    expect(value.name).toBe('xn--mnchen-3ya.de');
    expect(value.changes).toEqual([]);
  });

  it('encodes the German sharp s rather than silently folding it', () => {
    const value = ok('straße.de');
    expect(value.name.split('.')[0]).toMatch(/^xn--/);
    expect(value.changes.map((change) => change.kind)).toContain('converted_to_punycode');
  });
});

describe('normalizeDomainInput, suffix recognition', () => {
  it('rejects a suffix that no registry issues', () => {
    // The Public Suffix List has an implicit '*' rule, so an unknown last label parses as a valid
    // suffix. Without this check 192.0.2.carlton was accepted as a subdomain of 2.carlton.
    const error = err('192.0.2.carlton');
    expect(error.code).toBe('unknown_suffix');
    if (error.code === 'unknown_suffix') {
      expect(error.suffix).toBe('carlton');
      expect(error.name).toBe('192.0.2.carlton');
    }
  });

  it('keeps names under a private suffix, which is why isPrivate is checked too', () => {
    const value = ok('foo.vercel.app');
    expect(value.registrableDomain).toBe('foo.vercel.app');
    expect(value.publicSuffix).toBe('vercel.app');
  });

  it('names the special-use suffixes rather than telling them to add an ending', () => {
    for (const raw of ['localhost', 'app.localhost', 'printer.local', 'x.test', 'y.invalid']) {
      expect(err(raw).code).toBe('special_use_name');
    }
  });

  it('reports localhost by what it is, even when it arrives as a dev server URL', () => {
    const error = err('http://localhost:3000/claim');
    expect(error.code).toBe('special_use_name');
    if (error.code === 'special_use_name') {
      expect(error.name).toBe('localhost');
      expect(error.suffix).toBe('localhost');
    }
  });
});

describe('normalizeDomainInput, email addresses', () => {
  it('refuses an email address rather than silently claiming the provider', () => {
    const error = err('carlton@protonmail.com');
    expect(error.code).toBe('email_address');
    if (error.code === 'email_address') {
      expect(error.domainPart).toBe('protonmail.com');
      expect(error.input).toBe('carlton@protonmail.com');
    }
  });

  it('still strips credentials when a scheme is present', () => {
    const value = ok('https://user:pw@example.com');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toContain('removed_credentials');
  });

  it('treats a colon before the @ as credentials even without a scheme', () => {
    // An unquoted colon is not legal in an email local part, which is what separates the two.
    const value = ok('user:pw@example.com');
    expect(value.name).toBe('example.com');
    expect(value.changes.map((change) => change.kind)).toContain('removed_credentials');
  });
});

describe('normalizeDomainInput, failure positions', () => {
  it('reports which section is at fault so the whole name can be shown with it marked', () => {
    const error = err('example.-bad.com');
    expect(error.code).toBe('label_leading_hyphen');
    if (error.code === 'label_leading_hyphen') {
      expect(error.labelIndex).toBe(1);
      expect(error.label).toBe('-bad');
      expect(error.name).toBe('example.-bad.com');
    }
  });

  it('carries the reduced name, not the raw paste, once the input has been cut down', () => {
    const error = err('https://mycompany:8080/dashboard');
    expect(error.code).toBe('single_label');
    if (error.code === 'single_label') {
      expect(error.name).toBe('mycompany');
      expect(error.input).toBe('https://mycompany:8080/dashboard');
    }
  });
});
