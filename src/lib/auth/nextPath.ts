// src/lib/auth/nextPath.ts

/**
 * Control characters, including the newline and tab a browser strips out before parsing a URL,
 * which is how they smuggle a value past a check that reads the string as written.
 */
const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
};

/**
 * `next` arrives in a query string and ends up as a redirect target, so an unchecked value is an
 * open redirect: a link that looks like ours, carrying our name on the mail, landing on someone
 * else's site.
 *
 * The rule is that it has to be a path on this site. Anything else becomes null and the caller
 * falls back to its own default.
 */
export const safeNextPath = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  if (!raw.startsWith('/')) {
    return null;
  }
  // Browsers read `//host` and `/\host` as protocol relative URLs, so both leave the site while
  // still starting with a slash.
  if (raw.startsWith('//') || raw.startsWith('/\\')) {
    return null;
  }
  // A backslash is normalized to a slash by some parsers, so it can smuggle the two cases above
  // past a check that only looks at the first two characters.
  if (raw.includes('\\')) {
    return null;
  }
  if (hasControlCharacter(raw)) {
    return null;
  }
  return raw;
};
