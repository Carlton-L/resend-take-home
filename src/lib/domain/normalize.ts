// src/lib/domain/normalize.ts
import { parse } from 'tldts';

/** A single transformation applied to the user's input, in the order it happened. */
export type NormalizationChange =
  | { kind: 'trimmed' }
  | { kind: 'removed_control_characters'; count: number }
  | { kind: 'lowercased'; from: string }
  | { kind: 'removed_scheme'; removed: string }
  | { kind: 'removed_path'; removed: string }
  | { kind: 'removed_credentials' }
  | { kind: 'removed_port'; removed: string }
  | { kind: 'removed_trailing_dot' }
  | { kind: 'converted_to_punycode'; from: string }
  | { kind: 'normalized_by_parser'; from: string };

export type NormalizedDomain = {
  /** The name being claimed. Lowercased, punycode, no trailing dot. */
  name: string;
  /** The registrable domain the name sits under. Equal to name at an apex. */
  registrableDomain: string;
  /** The public suffix, from the Public Suffix List. */
  publicSuffix: string;
  isApex: boolean;
  /** Exactly what the user typed. */
  input: string;
  /** What was changed to get from input to name. Empty when nothing was changed. */
  changes: NormalizationChange[];
};

export type DomainInputError =
  | { code: 'empty' }
  | { code: 'input_too_long'; length: number; max: number }
  | { code: 'unparseable'; input: string }
  | { code: 'is_ip_address'; input: string }
  | { code: 'is_public_suffix'; suffix: string }
  | { code: 'single_label'; input: string }
  | { code: 'name_too_long'; length: number; max: number }
  | { code: 'empty_label'; input: string }
  | { code: 'label_too_long'; label: string; max: number }
  | { code: 'label_leading_hyphen'; label: string }
  | { code: 'label_trailing_hyphen'; label: string };

export type DomainInputResult =
  | { ok: true; value: NormalizedDomain }
  | { ok: false; error: DomainInputError };

/** RFC 1035 §2.3.4. Both limits apply to the wire format, which is the punycode form. */
const MAX_NAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

/** Nothing legitimate is this long. Guards the parsers against a very large paste. */
const MAX_INPUT_LENGTH = 2048;

const SCHEME = /^([a-z][a-z0-9+.-]*:)?\/\//i;
const PORT = /:\d+$/;
/** Backslash included because URL parsers treat it as a path separator for http and https. */
const PATH_START = /[/\\?#]/;
/** The URL parser strips these silently, so we strip them first and say that we did. */
const CONTROL_CHARACTERS = /[\t\n\r]/g;
const TRAILING_DOTS = /\.+$/;

const hasPunycodeLabel = (name: string) =>
  name.split('.').some((label) => label.startsWith('xn--'));

/**
 * Turns whatever the user typed into the name we will claim, or a typed reason why we cannot.
 *
 * Every transformation is recorded in `changes` so the interface can show what it did rather than
 * silently rewriting the input. Pure, no network, no environment access.
 */
export const normalizeDomainInput = (raw: string): DomainInputResult => {
  const changes: NormalizationChange[] = [];
  const input = raw;

  if (raw.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: { code: 'input_too_long', length: raw.length, max: MAX_INPUT_LENGTH },
    };
  }

  let work = raw.trim();
  if (work !== raw) {
    changes.push({ kind: 'trimmed' });
  }
  if (work === '') {
    return { ok: false, error: { code: 'empty' } };
  }

  // Before the scheme check, because a newline inside "htt\nps://" would hide the scheme from the
  // regex while the URL parser would still see it as one.
  const controlCharacters = work.match(CONTROL_CHARACTERS);
  if (controlCharacters) {
    changes.push({ kind: 'removed_control_characters', count: controlCharacters.length });
    work = work.replace(CONTROL_CHARACTERS, '');
  }

  // Scheme before anything that looks for a slash, or the search would cut at the scheme's own.
  const scheme = work.match(SCHEME);
  if (scheme) {
    changes.push({ kind: 'removed_scheme', removed: scheme[0] });
    work = work.slice(scheme[0].length);
  }

  // Path before credentials. An '@' can legitimately appear in a path, as in example.com/a@b, and
  // cutting at the first '@' before the path is gone would throw away the host.
  const pathAt = work.search(PATH_START);
  if (pathAt !== -1) {
    changes.push({ kind: 'removed_path', removed: work.slice(pathAt) });
    work = work.slice(0, pathAt);
  }

  const at = work.indexOf('@');
  if (at !== -1) {
    changes.push({ kind: 'removed_credentials' });
    work = work.slice(at + 1);
  }

  // After credentials: the colon in "user:pw@host" is not a port. The end anchor is what keeps
  // this from matching it, and the path has to be gone for the anchor to sit on the host.
  const port = work.match(PORT);
  if (port) {
    changes.push({ kind: 'removed_port', removed: port[0] });
    work = work.slice(0, work.length - port[0].length);
  }

  // A trailing dot is valid DNS meaning absolute. Both parsers below would keep it and then fail
  // to match the suffix list, so it comes off before either sees the string.
  if (TRAILING_DOTS.test(work)) {
    changes.push({ kind: 'removed_trailing_dot' });
    work = work.replace(TRAILING_DOTS, '');
  }

  if (work === '') {
    return { ok: false, error: { code: 'empty' } };
  }

  // The URL parser lowercases too. Doing it here is what lets us report that it happened.
  const lowered = work.toLowerCase();
  if (lowered !== work) {
    changes.push({ kind: 'lowercased', from: work });
    work = lowered;
  }

  // Label shape is checked before punycode, because an empty label can make the URL parser throw
  // and "unparseable" is a worse answer than naming the actual problem. Label length is checked
  // after, since the limit applies to the encoded form.
  const preLabels = work.split('.');
  if (preLabels.some((label) => label === '')) {
    return { ok: false, error: { code: 'empty_label', input } };
  }
  const leadingHyphen = preLabels.find((label) => label.startsWith('-'));
  if (leadingHyphen !== undefined) {
    return { ok: false, error: { code: 'label_leading_hyphen', label: leadingHyphen } };
  }
  const trailingHyphen = preLabels.find((label) => label.endsWith('-'));
  if (trailingHyphen !== undefined) {
    return { ok: false, error: { code: 'label_trailing_hyphen', label: trailingHyphen } };
  }

  // The URL parser applies IDNA and gives us punycode. It works in Node and in the browser, which
  // keeps this module usable on both sides. A hostname it refuses is one we could never query.
  let ascii: string;
  try {
    ascii = new URL(`https://${work}`).hostname;
  } catch {
    return { ok: false, error: { code: 'unparseable', input } };
  }
  if (ascii === '') {
    return { ok: false, error: { code: 'unparseable', input } };
  }
  if (ascii !== work) {
    // Only call it punycode when punycode actually appeared. The parser also normalizes
    // percent-encoding and some width and case forms, and reporting those as punycode would be
    // a false statement in a list whose whole purpose is being accurate.
    changes.push(
      hasPunycodeLabel(ascii) && !hasPunycodeLabel(work)
        ? { kind: 'converted_to_punycode', from: work }
        : { kind: 'normalized_by_parser', from: work },
    );
    work = ascii;
  }

  // Bracketed IPv6 survives the URL parser as [::1]; tldts does not recognise that form.
  if (work.startsWith('[')) {
    return { ok: false, error: { code: 'is_ip_address', input } };
  }

  if (work.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: { code: 'name_too_long', length: work.length, max: MAX_NAME_LENGTH },
    };
  }

  const oversizedLabel = work.split('.').find((label) => label.length > MAX_LABEL_LENGTH);
  if (oversizedLabel !== undefined) {
    return {
      ok: false,
      error: { code: 'label_too_long', label: oversizedLabel, max: MAX_LABEL_LENGTH },
    };
  }

  const parsed = parse(work, { allowPrivateDomains: true });

  if (parsed.isIp) {
    return { ok: false, error: { code: 'is_ip_address', input } };
  }
  if (!work.includes('.')) {
    return { ok: false, error: { code: 'single_label', input } };
  }
  if (parsed.publicSuffix === null) {
    return { ok: false, error: { code: 'unparseable', input } };
  }
  // Before the null-domain guard below: tldts reports domain as null when the input is exactly a
  // public suffix, so checking that guard first would report co.uk as unparseable.
  if (work === parsed.publicSuffix) {
    return { ok: false, error: { code: 'is_public_suffix', suffix: parsed.publicSuffix } };
  }
  if (parsed.domain === null) {
    return { ok: false, error: { code: 'unparseable', input } };
  }

  return {
    ok: true,
    value: {
      name: work,
      registrableDomain: parsed.domain,
      publicSuffix: parsed.publicSuffix,
      isApex: work === parsed.domain,
      input,
      changes,
    },
  };
};
