// src/lib/auth/messages.ts
import { SIGN_IN_LINK_TTL_MINUTES } from '@/lib/auth/config';

/**
 * Every string the sign in flow shows, in one module, so the copy can be read as a whole and
 * tested against the rules in one place.
 *
 * Each fact sits where it can be acted on. The form does not explain expiry, because there is no
 * link yet. Check your email states it, because it decides whether someone waits. The email states
 * expiry and single use, because it may be read hours later with nothing else around it. The dead
 * link page carries the explanation, because that is where it finally matters.
 */
export const signInCopy = {
  form: {
    heading: 'Sign in',
    label: 'Email address',
    submit: 'Send sign in link',
    submitting: 'Sending',
  },
  invalidEmail: {
    title: 'Enter a valid email address',
    description: 'The address must be in the form name@example.com.',
    action: 'Correct the address and send again.',
  },
  sent: {
    title: 'Check your email',
    description: (email: string) =>
      `A sign in link was sent to ${email}. It expires in ${SIGN_IN_LINK_TTL_MINUTES} minutes.`,
    resend: 'Send another link',
    resendIn: (seconds: number) => `Send another link in ${seconds}s`,
    changeAddress: 'Use a different address',
  },
  unavailable: {
    title: 'The link could not be sent',
    description: 'The email was not sent.',
    action: 'Try again in a moment.',
  },
  confirm: {
    title: 'Signing you in',
    description: (email: string) => `Signing in as ${email}. If nothing happens, press Sign in.`,
    submit: 'Sign in',
    note: 'This link works once.',
  },
  dead: {
    title: 'This link no longer works',
    description: `Sign in links work once, expire after ${SIGN_IN_LINK_TTL_MINUTES} minutes, and are replaced when a new one is sent.`,
    action: 'Send a new link',
  },
  header: {
    signOut: 'Sign out',
    /** The button the address and Sign out fold into on a phone. */
    account: 'Account',
  },
} as const;

/** The email itself. Separate, because it is read outside the product with no other context. */
export const signInEmailCopy = {
  subject: 'Sign in to DomainClaim',
  heading: 'Sign in to DomainClaim',
  /** The card's header label and its badge. */
  label: 'Sign in',
  badge: 'Link',
  /** The HTML part, which has a button. Also the inbox preview. */
  body: (email: string) => `Use the button below to sign in as ${email}.`,
  /** The text part, which has only the address. */
  bodyText: (email: string) => `Use the link below to sign in as ${email}.`,
  button: 'Sign in',
  expiry: `The link expires in ${SIGN_IN_LINK_TTL_MINUTES} minutes and works once.`,
  fallbackIntro: 'If the button does not work, paste this address into your browser:',
  ignore: 'If you did not ask to sign in, you can ignore this email.',
} as const;
