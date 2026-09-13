// src/lib/http/sameOrigin.ts

/**
 * Refuses a state-changing POST that did not come from a page on this deployment.
 *
 * The session cookie is SameSite=Lax, which already stops a cross-site form post from carrying it,
 * so this is a second check rather than the only one. It costs one header read, and it means a
 * mistake in cookie configuration does not immediately become a way to delete someone's claim.
 *
 * Compared against the host the request arrived on rather than APP_ORIGIN, because a preview
 * deployment is served from a host that variable does not name.
 */
export const isSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  if (origin === null) {
    return false;
  }
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    URL.parse(request.url)?.host;
  if (!host) {
    return false;
  }
  return URL.parse(origin)?.host === host;
};
