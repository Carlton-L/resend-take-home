// src/lib/http/wantsJson.ts

/**
 * Whether the caller is the app's own fetch rather than a plain form post.
 *
 * The routes that still take form posts answer those with a 303, and answer JSON when the request
 * asked for it or sent it. Both paths live side by side until the old screens are gone.
 */
export const wantsJson = (request: Request): boolean => {
  const accept = request.headers.get('accept') ?? '';
  const contentType = request.headers.get('content-type') ?? '';
  return accept.includes('application/json') || contentType.includes('application/json');
};
