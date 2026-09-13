// src/lib/copy/rules.ts

/**
 * The mechanically checkable half of the copy rules in CLAUDE.md. The rest, no "X, not Y"
 * constructions and no aphorism openers, needs a reader.
 *
 * Every module that produces user-facing strings asserts against this list, so the rules live in
 * one place and a new screen inherits them.
 */
export const BANNED_PHRASES = ['—', '–', 'honestly', 'genuinely', 'load-bearing', 'worth', '!'];

/** Every banned phrase that appears in the given strings, paired with the string it appeared in. */
export const findBannedPhrases = (strings: readonly string[]): { phrase: string; text: string }[] =>
  BANNED_PHRASES.flatMap((phrase) =>
    strings.filter((text) => text.toLowerCase().includes(phrase)).map((text) => ({ phrase, text })),
  );
