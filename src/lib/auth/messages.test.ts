// src/lib/auth/messages.test.ts
import { describe, expect, it } from 'vitest';
import { SIGN_IN_LINK_TTL_MINUTES } from '@/lib/auth/config';
import { signInCopy, signInEmailCopy } from '@/lib/auth/messages';
import { findBannedPhrases } from '@/lib/copy/rules';
import { buildSignInEmail } from '@/lib/email/signInEmail';

const SAMPLE_EMAIL = 'carlton@example.com';
const SAMPLE_URL = 'https://domainclaim.example/auth/confirm?token_hash=abc&email=a%40b.c&sig=xyz';

/** Every string the flow can show, with the interpolated ones given a sample. */
const everyString: string[] = [
  ...Object.values(signInCopy.form),
  ...Object.values(signInCopy.invalidEmail),
  signInCopy.sent.title,
  signInCopy.sent.description(SAMPLE_EMAIL),
  signInCopy.sent.resend,
  signInCopy.sent.resendIn(12),
  signInCopy.sent.changeAddress,
  signInCopy.sent.label,
  signInCopy.sent.badge,
  signInCopy.sent.resent,
  signInCopy.oauthFailed,
  ...Object.values(signInCopy.unavailable),
  signInCopy.confirm.title,
  signInCopy.confirm.description(SAMPLE_EMAIL),
  signInCopy.confirm.submit,
  signInCopy.confirm.note,
  ...Object.values(signInCopy.dead),
  ...Object.values(signInCopy.header),
  signInEmailCopy.subject,
  signInEmailCopy.heading,
  signInEmailCopy.body(SAMPLE_EMAIL),
  signInEmailCopy.button,
  signInEmailCopy.expiry,
  signInEmailCopy.fallbackIntro,
  signInEmailCopy.ignore,
];

describe('sign in copy', () => {
  it('follows the copy rules', () => {
    expect(findBannedPhrases(everyString)).toEqual([]);
  });

  it('never says magic link, because the button describes the mechanism instead', () => {
    const offenders = everyString.filter((text) => text.toLowerCase().includes('magic'));
    expect(offenders).toEqual([]);
  });

  it('names the address on check your email, so a typo is catchable', () => {
    expect(signInCopy.sent.description(SAMPLE_EMAIL)).toContain(SAMPLE_EMAIL);
  });

  it('states the expiry where someone decides whether to wait', () => {
    expect(signInCopy.sent.description(SAMPLE_EMAIL)).toContain(String(SIGN_IN_LINK_TTL_MINUTES));
  });

  it('leaves expiry off the form, where there is no link yet to expire', () => {
    const formStrings = Object.values(signInCopy.form).join(' ');
    expect(formStrings).not.toContain(String(SIGN_IN_LINK_TTL_MINUTES));
    expect(formStrings.toLowerCase()).not.toContain('expire');
  });

  it('explains expiry and single use on the dead link page, which is where it lands', () => {
    expect(signInCopy.dead.description).toContain(String(SIGN_IN_LINK_TTL_MINUTES));
    expect(signInCopy.dead.description.toLowerCase()).toContain('once');
  });

  it('names the causes a person can hit, including a newer link replacing this one', () => {
    const description = signInCopy.dead.description.toLowerCase();
    expect(description).toContain('once');
    expect(description).toContain('replace');
  });

  it('does not blame the reader for a dead link', () => {
    const offenders = ['you should have', 'you failed', 'invalid'].filter((phrase) =>
      signInCopy.dead.description.toLowerCase().includes(phrase),
    );
    expect(offenders).toEqual([]);
  });

  it('ends the dead link page with one action', () => {
    expect(signInCopy.dead.action.length).toBeGreaterThan(0);
  });
});

describe('buildSignInEmail', () => {
  const email = buildSignInEmail(SAMPLE_EMAIL, SAMPLE_URL);

  it('sends both a written text part and an HTML part', () => {
    expect(email.text.length).toBeGreaterThan(0);
    expect(email.html.length).toBeGreaterThan(0);
  });

  it('puts the URL in both parts, so the destination is visible before it is followed', () => {
    expect(email.text).toContain(SAMPLE_URL);
    expect(email.html).toContain('https://domainclaim.example/auth/confirm');
  });

  it('states expiry and single use, because it may be read hours later', () => {
    expect(email.text).toContain(String(SIGN_IN_LINK_TTL_MINUTES));
    expect(email.text.toLowerCase()).toContain('once');
  });

  it('tells a reader who did not ask what to do', () => {
    expect(email.text).toContain(signInEmailCopy.ignore);
  });

  it('escapes markup rather than letting a value close a tag', () => {
    const hostile = buildSignInEmail('a"><script>x</script>@example.com', SAMPLE_URL);
    expect(hostile.html).not.toContain('<script>');
  });

  it('says button in the HTML part and link in the text part', () => {
    expect(email.html).toContain('Use the button below to sign in as');
    expect(email.text).toContain(signInEmailCopy.bodyText(SAMPLE_EMAIL));
    expect(email.text).not.toContain('button');
  });

  it('previews the first line of the body in the inbox', () => {
    const body = email.html.slice(email.html.indexOf('<body'));
    expect(body.indexOf(signInEmailCopy.body(SAMPLE_EMAIL))).toBeLessThan(body.indexOf('<table'));
  });

  it('fits a phone, where the old template was fixed at 480px', () => {
    expect(email.html).not.toContain('width="480"');
    expect(email.html).toContain('max-width:520px');
  });

  it('follows the copy rules in the rendered text part', () => {
    expect(findBannedPhrases([email.text])).toEqual([]);
  });
});
