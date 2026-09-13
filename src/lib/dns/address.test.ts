// src/lib/dns/address.test.ts
import { describe, expect, it } from 'vitest';
import { isQueryableAddress } from '@/lib/dns/address';

describe('isQueryableAddress', () => {
  it('allows ordinary public addresses', () => {
    // Real Google nameserver addresses, from a live trace of carlton.dev.
    for (const address of ['216.239.38.106', '216.239.32.106', '8.8.8.8', '1.1.1.1']) {
      expect(isQueryableAddress(address)).toBe(true);
    }
  });

  it('refuses the ranges a zone could point us at to probe our own network', () => {
    const blocked = [
      '127.0.0.1', // loopback
      '10.1.2.3', // private
      '172.16.0.1', // private
      '172.31.255.255', // private, top of the range
      '192.168.1.1', // private
      '169.254.169.254', // link local, the cloud metadata address
      '100.64.0.1', // carrier grade NAT
      '0.0.0.0',
      '224.0.0.1', // multicast
      '255.255.255.255', // broadcast
    ];
    for (const address of blocked) {
      expect(isQueryableAddress(address), address).toBe(false);
    }
  });

  it('keeps the edges of the private ranges straight', () => {
    // One address either side of 172.16.0.0/12, which is the range people get wrong.
    expect(isQueryableAddress('172.15.255.255')).toBe(true);
    expect(isQueryableAddress('172.32.0.0')).toBe(true);
    expect(isQueryableAddress('172.16.0.0')).toBe(false);
    expect(isQueryableAddress('172.31.0.1')).toBe(false);
    // And 100.64.0.0/10, which ends at 100.127.255.255.
    expect(isQueryableAddress('100.63.255.255')).toBe(true);
    expect(isQueryableAddress('100.128.0.0')).toBe(true);
    expect(isQueryableAddress('100.127.0.1')).toBe(false);
  });

  it('refuses the documentation ranges, which is also what the fake resolver uses', () => {
    expect(isQueryableAddress('198.51.100.1')).toBe(false);
    expect(isQueryableAddress('192.0.2.1')).toBe(false);
    expect(isQueryableAddress('203.0.113.1')).toBe(false);
  });

  it('refuses anything that is not a plain dotted quad', () => {
    for (const address of [
      '',
      'example.com',
      '1.2.3',
      '1.2.3.4.5',
      '256.1.1.1',
      '01.2.3.4',
      '::1',
    ]) {
      expect(isQueryableAddress(address), address).toBe(false);
    }
  });
});
