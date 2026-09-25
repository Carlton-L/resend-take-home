// src/lib/favicon/icons.ts

/** Largest icon we pass on. A favicon is a few kilobytes; anything past this isn't one. */
export const MAX_ICON_BYTES = 256 * 1024;

/** How much of a home page is read looking for its icon links. They sit in the head. */
export const MAX_PAGE_BYTES = 64 * 1024;

/**
 * Raster images only. An SVG is a document that can run script, and this route serves it from our
 * own origin, so opening its address directly would run a stranger's script as us.
 */
const ALLOWED_TYPES = [
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/gif',
  'image/jpeg',
  'image/webp',
  'image/avif',
];

/** The media type without parameters, lower case. */
export const mediaType = (contentType: string | null): string =>
  (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';

/** Whether a response can be passed on as a favicon. */
export const acceptableIcon = (contentType: string | null, byteLength: number): boolean =>
  ALLOWED_TYPES.includes(mediaType(contentType)) && byteLength > 0 && byteLength <= MAX_ICON_BYTES;

const attribute = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (match === null) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
};

/**
 * The icon addresses a page names in its `<link>` tags, best first, resolved against the page.
 *
 * `icon` and `shortcut icon` first, then `apple-touch-icon`, which is larger and usually a PNG.
 * SVG icons are skipped, since they won't be served. Only http and https addresses come back.
 */
export const iconLinks = (html: string, pageUrl: string): string[] => {
  const icons: string[] = [];
  const touch: string[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    const href = attribute(tag, 'href');
    if (href === null || href.trim() === '') {
      continue;
    }
    const type = attribute(tag, 'type')?.toLowerCase() ?? '';
    if (type.includes('svg') || /\.svg(\?|#|$)/i.test(href)) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(href.trim(), pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      continue;
    }
    if (rel.includes('icon')) {
      icons.push(url.toString());
    } else if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) {
      touch.push(url.toString());
    }
  }
  return [...new Set([...icons, ...touch])];
};
