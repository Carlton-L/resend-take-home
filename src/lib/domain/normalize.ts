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

/**
 * Why the input cannot be claimed.
 *
 * Data only, no English. Every failure after the input has been reduced carries `name`, the value
 * we were working with at that point, so a message can talk about what we read rather than the raw
 * paste. Failures at a single label also carry its index, so the interface can show the whole name
 * with that section marked.
 */
export type DomainInputError =
  | { code: 'empty' }
  | { code: 'input_too_long'; length: number; max: number }
  | { code: 'email_address'; input: string; domainPart: string }
  | { code: 'unparseable'; input: string; name: string }
  | { code: 'is_ip_address'; input: string; name: string }
  | { code: 'leading_dot'; name: string }
  | { code: 'double_dot'; name: string }
  | { code: 'label_leading_hyphen'; name: string; labelIndex: number; label: string }
  | { code: 'label_trailing_hyphen'; name: string; labelIndex: number; label: string }
  | { code: 'label_too_long'; name: string; labelIndex: number; label: string; max: number }
  | { code: 'name_too_long'; name: string; length: number; max: number }
  | { code: 'special_use_name'; name: string; suffix: string }
  | { code: 'single_label'; input: string; name: string }
  | { code: 'is_public_suffix'; name: string; suffix: string }
  | { code: 'unknown_suffix'; name: string; suffix: string };

export type DomainInputResult =
  | { ok: true; value: NormalizedDomain }
  | { ok: false; error: DomainInputError };

/** RFC 1035 section 2.3.4. Both limits apply to the wire format, which is the punycode form. */
const MAX_NAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

/** Nothing legitimate is this long. Guards the parsers against a very large paste. */
const MAX_INPUT_LENGTH = 2048;

/**
 * Top-level names the standards reserve. None of them resolve in the public DNS, so there is never
 * a zone to hold a record. RFC 6761 defines localhost, test, invalid and example; RFC 7686 defines
 * onion; RFC 6762 uses local for mDNS.
 *
 * Deliberately not including `internal`, which ICANN reserved separately. It falls through to
 * `unknown_suffix`, which says something true without this file claiming a standard it does not
 * cite.
 */
const SPECIAL_USE_SUFFIXES = new Set(['localhost', 'test', 'invalid', 'example', 'local', 'onion']);

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
 *
 * Failures are reported one at a time. The checks are a pipeline where each stage depends on the
 * one before it, so collecting several is only possible within the per-label group and would mean
 * handing the user more than one next action. See docs/RFC.md.
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
  const hadScheme = scheme !== null;
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
    // An '@' means one of two things and they need opposite handling. URL credentials in the wild
    // carry a scheme, and a colon separating user from password. Without either, this is an email
    // address, and stripping the local part would quietly turn "my email" into a claim on the
    // provider's domain. An unquoted colon is not legal in an email local part, which is what makes
    // it a usable discriminator. A quoted local part containing one is legal and not detected here.
    const localPart = work.slice(0, at);
    if (!hadScheme && !localPart.includes(':')) {
      return { ok: false, error: { code: 'email_address', input, domainPart: work.slice(at + 1) } };
    }
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
  // A leading dot and an interior double dot are the same defect to a parser and different
  // mistakes to a person. Removing the dot from ".com" would only produce the next error.
  if (preLabels[0] === '') {
    return { ok: false, error: { code: 'leading_dot', name: work } };
  }
  if (preLabels.some((label) => label === '')) {
    return { ok: false, error: { code: 'double_dot', name: work } };
  }
  const leadingHyphen = preLabels.findIndex((label) => label.startsWith('-'));
  if (leadingHyphen !== -1) {
    return {
      ok: false,
      error: {
        code: 'label_leading_hyphen',
        name: work,
        labelIndex: leadingHyphen,
        label: preLabels[leadingHyphen],
      },
    };
  }
  const trailingHyphen = preLabels.findIndex((label) => label.endsWith('-'));
  if (trailingHyphen !== -1) {
    return {
      ok: false,
      error: {
        code: 'label_trailing_hyphen',
        name: work,
        labelIndex: trailingHyphen,
        label: preLabels[trailingHyphen],
      },
    };
  }

  // The URL parser applies IDNA and gives us punycode. It works in Node and in the browser, which
  // keeps this module usable on both sides. A hostname it refuses is one we could never query.
  let ascii: string;
  try {
    ascii = new URL(`https://${work}`).hostname;
  } catch {
    return { ok: false, error: { code: 'unparseable', input, name: work } };
  }
  if (ascii === '') {
    return { ok: false, error: { code: 'unparseable', input, name: work } };
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
    return { ok: false, error: { code: 'is_ip_address', input, name: work } };
  }

  if (work.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: { code: 'name_too_long', name: work, length: work.length, max: MAX_NAME_LENGTH },
    };
  }

  const asciiLabels = work.split('.');
  const oversized = asciiLabels.findIndex((label) => label.length > MAX_LABEL_LENGTH);
  if (oversized !== -1) {
    return {
      ok: false,
      error: {
        code: 'label_too_long',
        name: work,
        labelIndex: oversized,
        label: asciiLabels[oversized],
        max: MAX_LABEL_LENGTH,
      },
    };
  }

  const parsed = parse(work, { allowPrivateDomains: true });

  if (parsed.isIp) {
    return { ok: false, error: { code: 'is_ip_address', input, name: work } };
  }

  // Before the single-label check, so a bare `localhost` is told what it actually is rather than
  // being told to add an ending.
  const finalLabel = asciiLabels[asciiLabels.length - 1];
  if (SPECIAL_USE_SUFFIXES.has(finalLabel)) {
    return { ok: false, error: { code: 'special_use_name', name: work, suffix: finalLabel } };
  }

  if (!work.includes('.')) {
    return { ok: false, error: { code: 'single_label', input, name: work } };
  }
  if (parsed.publicSuffix === null) {
    return { ok: false, error: { code: 'unparseable', input, name: work } };
  }
  // Before the null-domain guard below: tldts reports domain as null when the input is exactly a
  // public suffix, so checking that guard first would report co.uk as unparseable.
  if (work === parsed.publicSuffix) {
    return {
      ok: false,
      error: { code: 'is_public_suffix', name: work, suffix: parsed.publicSuffix },
    };
  }
  if (parsed.domain === null) {
    return { ok: false, error: { code: 'unparseable', input, name: work } };
  }
  // The Public Suffix List carries an implicit `*` rule, so an unrecognised last label parses as a
  // valid suffix with one name under it. Both flags false is what separates a made-up ending from
  // a real one. isPrivate is what keeps names like foo.vercel.app valid.
  if (!parsed.isIcann && !parsed.isPrivate) {
    return {
      ok: false,
      error: { code: 'unknown_suffix', name: work, suffix: parsed.publicSuffix },
    };
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
