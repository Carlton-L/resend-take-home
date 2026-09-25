// src/lib/auth/gate.ts
import { DEFAULT_SIGNED_IN_PATH, SIGN_IN_PATH } from '@/lib/auth/config';
import { safeNextPath } from '@/lib/auth/nextPath';
import { CLAIM_PATH, DOMAINS_PATH } from '@/lib/claims/config';

/** Pages that only make sense signed in. Their API routes refuse on their own. */
const APP_PATHS = [DOMAINS_PATH, CLAIM_PATH];

const isAppPath = (pathname: string): boolean =>
  APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Where the proxy sends a page request, or null to let it through.
 *
 * This is for the person, not for security. The pages read no data, and every API route checks the
 * session itself. What this saves is a signed out visitor landing on an empty screen, and a signed
 * in one landing on the sign in form.
 */
export const gateFor = (url: { pathname: string; search: string }, signedIn: boolean) => {
  const { pathname, search } = url;

  if (!signedIn && isAppPath(pathname)) {
    return `${SIGN_IN_PATH}?next=${encodeURIComponent(`${pathname}${search}`)}`;
  }

  if (signedIn && pathname === SIGN_IN_PATH) {
    return safeNextPath(new URLSearchParams(search).get('next')) ?? DEFAULT_SIGNED_IN_PATH;
  }

  return null;
};
