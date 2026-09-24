// src/lib/auth/confirmUrl.ts
import 'server-only';
import { appOrigin, CONFIRM_PATH } from '@/lib/auth/config';
import { safeNextPath } from '@/lib/auth/nextPath';
import { type ConfirmLinkClaims, signConfirmLink } from '@/lib/auth/secrets';

/**
 * The URL that goes in the mail.
 *
 * It points at us rather than at Supabase, because `generateLink` returns a hashed token and
 * `verifyOtp` accepts one. That is what lets the confirmation happen on POST, and it means every
 * URL a recipient sees belongs to this product.
 *
 * The address travels in the link so the page can name the account being signed in to, and the
 * signature is what makes that name trustworthy. Without it anyone could send a victim a link
 * holding their own valid token and a display of the victim's address, and the victim would sign
 * in to the sender's account believing it was theirs.
 */
export const buildConfirmUrl = (claims: ConfirmLinkClaims): string => {
  const next = safeNextPath(claims.next);
  const signed: ConfirmLinkClaims = { ...claims, email: claims.email.toLowerCase(), next };
  const url = new URL(CONFIRM_PATH, `${appOrigin()}/`);
  url.searchParams.set('token_hash', signed.tokenHash);
  url.searchParams.set('email', signed.email);
  if (next !== null) {
    url.searchParams.set('next', next);
  }
  url.searchParams.set('sig', signConfirmLink(signed));
  return url.toString();
};
