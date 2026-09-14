// src/lib/auth/config.ts
import { DOMAINS_PATH } from '@/lib/claims/config';

/**
 * Supabase owns the expiry, so this number has to match the project's Email OTP expiration setting
 * under Authentication, Sign In / Providers, Email. Nothing in this code can read that setting, so
 * changing it there without changing this makes the interface state something untrue.
 */
export const SIGN_IN_LINK_TTL_SECONDS = 900;

export const SIGN_IN_LINK_TTL_MINUTES = SIGN_IN_LINK_TTL_SECONDS / 60;

/** How long the resend control stays disabled, so a person is told to wait rather than limited. */
export const RESEND_COOLDOWN_SECONDS = 30;

export const SIGN_IN_PATH = '/signin';
export const CONFIRM_PATH = '/auth/confirm';
export const LINK_DEAD_PATH = '/auth/link-expired';

/**
 * Where sign in lands when the link carried no destination.
 *
 * The list, always, rather than a rule that reads how many claims the account has. A first-time
 * user gets an empty list whose only control is a link to the claim screen, so the first run is
 * one extra click and every later visit starts on the account's own state.
 *
 * One line to change if that turns out to be wrong: point it at `CLAIM_PATH`.
 */
export const DEFAULT_SIGNED_IN_PATH = DOMAINS_PATH;

/** carlton.dev is already verified with Resend. No sending subdomain at this volume. */
export const MAIL_FROM = 'DomainClaim <domainclaim@carlton.dev>';

/**
 * Sending limits. Three counters, because per address and per IP still leave a spread attempt free
 * to burn the day's sending quota.
 */
export const SEND_LIMITS = {
  perEmail: { max: 5, windowSeconds: 15 * 60 },
  perIp: { max: 10, windowSeconds: 60 * 60 },
  global: { max: 80, windowSeconds: 24 * 60 * 60 },
} as const;

/** Rows older than the longest window can never change a decision. */
export const ATTEMPT_RETENTION_SECONDS = SEND_LIMITS.global.windowSeconds;

/**
 * The origin every emailed link is built from. Never taken from the request: a forged Host header
 * would otherwise put an attacker's origin into a mail carrying a valid token, and the recipient
 * would hand them the credential by clicking it. VERCEL_URL is set by the platform, so a preview
 * deployment builds correct links with no configuration.
 */
export const appOrigin = (): string => {
  const configured = process.env.APP_ORIGIN;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};
