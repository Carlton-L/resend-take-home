// src/lib/favicon/fetch.ts
import 'server-only';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { isQueryableAddress } from '@/lib/dns/address';
import {
  acceptableIcon,
  iconLinks,
  MAX_ICON_BYTES,
  MAX_PAGE_BYTES,
  mediaType,
} from '@/lib/favicon/icons';

/** Per request. A site that takes longer than this for its icon gets the globe. */
const TIMEOUT_MS = 2000;
/** The whole search, however many requests it takes. */
const BUDGET_MS = 5000;
/** Redirects followed per address, each checked the same way as the first. */
const MAX_HOPS = 2;
/** Icon links from the home page tried after /favicon.ico. */
const MAX_LINKS = 2;

type Got = { url: URL; contentType: string | null; body: Buffer };

/**
 * The one public IPv4 address a host resolves to, or null.
 *
 * A claimed name is typed by a stranger and so is where it points. Without this our server would
 * fetch loopback, private and cloud metadata addresses on request. Every address the name has must
 * be public, and the request is then pinned to the one that was checked, so a second lookup can't
 * answer differently between the check and the fetch.
 */
const publicAddress = async (host: string): Promise<string | null> => {
  if (isIP(host) !== 0) {
    return isQueryableAddress(host) ? host : null;
  }
  try {
    const found = await lookup(host, { all: true, family: 4 });
    if (found.length === 0 || !found.every((entry) => isQueryableAddress(entry.address))) {
      return null;
    }
    return found[0]?.address ?? null;
  } catch {
    return null;
  }
};

/** One GET to a checked address. `truncate` keeps the first bytes of a page; an icon over the cap fails. */
const request = (
  url: URL,
  address: string,
  maxBytes: number,
  truncate: boolean,
): Promise<{
  status: number;
  location: string | null;
  contentType: string | null;
  body: Buffer;
} | null> =>
  new Promise((resolve) => {
    const client = url.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (value: Parameters<typeof resolve>[0]) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const req = client.request(
      url,
      {
        method: 'GET',
        timeout: TIMEOUT_MS,
        servername: url.hostname,
        headers: { 'user-agent': 'DomainClaim favicon', accept: 'image/*,text/html;q=0.8' },
        // Pinned to the address that was checked.
        lookup: (_host, options, callback) => {
          if ((options as { all?: boolean }).all) {
            (callback as (e: null, a: { address: string; family: number }[]) => void)(null, [
              { address, family: 4 },
            ]);
          } else {
            (callback as (e: null, a: string, f: number) => void)(null, address, 4);
          }
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () =>
          done({
            status: res.statusCode ?? 0,
            location: typeof res.headers.location === 'string' ? res.headers.location : null,
            contentType: res.headers['content-type'] ?? null,
            body: Buffer.concat(chunks),
          });
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            if (truncate) {
              chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
              finish();
            } else {
              done(null);
            }
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', finish);
        res.on('error', () => done(null));
      },
    );
    req.on('timeout', () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null));
    req.end();
  });

/**
 * GET with redirects followed by hand, each hop checked again: http or https, the default port
 * only, a public address. Anything else ends the search.
 */
const get = async (start: URL, maxBytes: number, truncate: boolean): Promise<Got | null> => {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.port !== '') {
      return null;
    }
    const address = await publicAddress(url.hostname);
    if (address === null) {
      return null;
    }
    const got = await request(url, address, maxBytes, truncate);
    if (got === null) {
      return null;
    }
    if (got.status >= 300 && got.status < 400 && got.location !== null) {
      try {
        url = new URL(got.location, url);
      } catch {
        return null;
      }
      continue;
    }
    return got.status === 200 ? { url, contentType: got.contentType, body: got.body } : null;
  }
  return null;
};

export type Icon = { contentType: string; body: Buffer };

const asIcon = (got: Got | null): Icon | null =>
  got !== null && acceptableIcon(got.contentType, got.body.length)
    ? { contentType: mediaType(got.contentType), body: got.body }
    : null;

/**
 * A claimed name's icon: `/favicon.ico` first, then the icons its home page links to. Null when
 * none of those is a small raster image, which the screen shows as the globe.
 */
export const fetchFavicon = async (name: string): Promise<Icon | null> => {
  const started = Date.now();
  const inTime = () => Date.now() - started < BUDGET_MS;

  const root = new URL(`https://${name}/`);
  const direct = asIcon(await get(new URL('/favicon.ico', root), MAX_ICON_BYTES, false));
  if (direct !== null || !inTime()) {
    return direct;
  }

  const page = await get(root, MAX_PAGE_BYTES, true);
  if (page === null || mediaType(page.contentType) !== 'text/html') {
    return null;
  }
  for (const link of iconLinks(page.body.toString('utf8'), page.url.toString()).slice(
    0,
    MAX_LINKS,
  )) {
    if (!inTime()) {
      return null;
    }
    const icon = asIcon(await get(new URL(link), MAX_ICON_BYTES, false));
    if (icon !== null) {
      return icon;
    }
  }
  return null;
};
