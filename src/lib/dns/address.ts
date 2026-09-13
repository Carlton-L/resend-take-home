// src/lib/dns/address.ts

/**
 * Whether we are willing to send a DNS query to an address.
 *
 * The nameservers we query come from the zone being checked, which means the person being checked
 * chooses them. A zone can list a nameserver whose hostname resolves to a loopback, private or
 * link-local address, and without this our server would send UDP/53 there on request. That is a
 * probe of whatever network our function sits on, asked for by a stranger.
 *
 * It cannot read cloud metadata, which is HTTP on port 80 rather than DNS on 53, but seeing which
 * internal addresses answer is disclosure on its own. Refusing before the packet leaves is cheap
 * and the refusal is visible in the trace.
 *
 * IPv4 only, because the resolver only looks up A records today. A nameserver reachable only over
 * IPv6 is a known gap, recorded in spec.md.
 */

const toNumber = (address: string): number | null => {
  const parts = address.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    // Rejects '01', '1e2', '' and anything non-numeric, so no surprising coercions get through.
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }
  return value;
};

/** IANA special-purpose IPv4 registry, the entries that are not globally reachable. */
const RESERVED: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // this network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link local, and where cloud metadata lives
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast, deprecated
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, and the broadcast address
];

const within = (value: number, base: string, bits: number): boolean => {
  const baseValue = toNumber(base);
  if (baseValue === null) {
    return false;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) >>> 0 === (baseValue & mask) >>> 0;
};

export const isQueryableAddress = (address: string): boolean => {
  const value = toNumber(address);
  if (value === null) {
    return false;
  }
  return !RESERVED.some(([base, bits]) => within(value, base, bits));
};
