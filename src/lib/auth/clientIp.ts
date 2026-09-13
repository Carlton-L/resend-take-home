// src/lib/auth/clientIp.ts

/** Strips leading zeros and lowercases, so one address always produces one bucket. */
const normalizeGroup = (group: string): string => group.toLowerCase().replace(/^0+(?=.)/, '');

/**
 * Expands the `::` shorthand so a compressed address and its written out form land in the same
 * bucket. Returns null for anything that is not a plausible IPv6 address, which the caller reads
 * as unknown.
 */
export const expandIpv6 = (address: string): string[] | null => {
  if (address.indexOf('::') !== address.lastIndexOf('::')) {
    return null;
  }
  const [head, tail] = address.split('::');
  if (tail === undefined) {
    const groups = (head ?? '').split(':');
    return groups.length === 8 ? groups.map(normalizeGroup) : null;
  }
  const left = head === '' ? [] : (head ?? '').split(':');
  const right = tail === '' ? [] : tail.split(':');
  const fill = 8 - left.length - right.length;
  if (fill < 0) {
    return null;
  }
  return [...left, ...Array.from({ length: fill }, () => '0'), ...right].map(normalizeGroup);
};

/**
 * The key the per source limit counts on.
 *
 * IPv6 is cut to the first four groups, the /64 that a single subscriber is routinely handed.
 * Keying on the whole address would hand one person an unlimited supply of buckets, which is the
 * same as no limit.
 *
 * Vercel sets `x-forwarded-for` at its edge and appends the client address, so the header is not
 * something a caller can simply invent. Which entry the platform guarantees is unverified, and is
 * checked against a real request on the first deployment.
 */
export const clientIpBucket = (headers: Headers): string => {
  const forwarded = headers.get('x-forwarded-for') ?? headers.get('x-real-ip');
  const first = forwarded?.split(',')[0]?.trim();
  if (!first) {
    return 'unknown';
  }
  // `[2001:db8::1]:4000` is the bracketed form some proxies use.
  const bracketed = first.match(/^\[(.+)\]/);
  const address = bracketed?.[1] ?? first;
  if (address.includes(':')) {
    const groups = expandIpv6(address);
    return groups === null ? 'unknown' : groups.slice(0, 4).join(':');
  }
  return address;
};
