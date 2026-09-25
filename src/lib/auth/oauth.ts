// src/lib/auth/oauth.ts
import { safeNextPath } from '@/lib/auth/nextPath';

/**
 * The providers the sign in screen offers. Each is enabled in Supabase with its own OAuth app.
 * GitHub only: the people claiming a domain here have a GitHub account, and a second provider is
 * a second app to keep registered for no one new.
 */
export const OAUTH_PROVIDERS = ['github'] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const isOAuthProvider = (value: string): value is OAuthProvider =>
  (OAUTH_PROVIDERS as readonly string[]).includes(value);

export const OAUTH_START_PATH = (provider: OAuthProvider) => `/api/auth/oauth/${provider}`;
export const OAUTH_CALLBACK_PATH = '/api/auth/callback';

/**
 * Where the provider sends the browser back to. Built from the configured origin rather than the
 * request, for the same reason as the emailed link. `next` is checked here too, so the value that
 * comes back on the callback has been through the same filter once already.
 */
export const oauthCallbackUrl = (origin: string, next: string | null): string => {
  const url = new URL(OAUTH_CALLBACK_PATH, origin);
  const safe = safeNextPath(next);
  if (safe !== null) {
    url.searchParams.set('next', safe);
  }
  return url.toString();
};
