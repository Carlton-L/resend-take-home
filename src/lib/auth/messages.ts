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
    title: 'That is not an email address',
    description: 'The field needs an address in the form name@example.com.',
    action: 'Check it for a typo and send again.',
  },
  sent: {
    title: 'Check your email',
    description: (email: string) =>
      `A sign in link is on its way to ${email}. It expires in ${SIGN_IN_LINK_TTL_MINUTES} minutes.`,
    resend: 'Send another link',
    resendIn: (seconds: number) => `Send another link in ${seconds}s`,
    changeAddress: 'Use a different address',
  },
  unavailable: {
    title: 'The link could not be sent',
    description: 'Something here failed before the email went out.',
    action: 'Try again in a moment.',
  },
  confirm: {
    title: 'Sign in to DomainClaim',
    description: (email: string) => `You are about to sign in as ${email}.`,
    submit: 'Sign in',
    note: 'This link can be used once.',
  },
  dead: {
    title: 'This link no longer works',
    description: `A sign in link works once. Sending a new one replaces the last one, and every link stops working after ${SIGN_IN_LINK_TTL_MINUTES} minutes.`,
    action: 'Send a new link',
  },
  header: {
    signOut: 'Sign out',
  },
} as const;

/** The email itself. Separate, because it is read outside the product with no other context. */
export const signInEmailCopy = {
  subject: 'Sign in to DomainClaim',
  heading: 'Sign in to DomainClaim',
  body: (email: string) => `Use the link below to sign in as ${email}.`,
  button: 'Sign in',
  expiry: `This link expires in ${SIGN_IN_LINK_TTL_MINUTES} minutes and can be used once.`,
  fallbackIntro: 'If the button does not work, paste this address into your browser:',
  ignore: 'If you did not ask to sign in, you can ignore this email.',
} as const;
