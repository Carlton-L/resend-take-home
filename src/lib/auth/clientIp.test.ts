// src/lib/auth/clientIp.test.ts
import { describe, expect, it } from 'vitest';
import { clientIpBucket, expandIpv6 } from '@/lib/auth/clientIp';

const headers = (values: Record<string, string>) => new Headers(values);

describe('expandIpv6', () => {
  it('expands a compressed address to eight groups', () => {
    expect(expandIpv6('2001:db8::1')).toEqual(['2001', 'db8', '0', '0', '0', '0', '0', '1']);
  });

  it('agrees with the written out form', () => {
    expect(expandIpv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toEqual(
      expandIpv6('2001:db8::1'),
    );
  });

  it('handles the loopback address', () => {
    expect(expandIpv6('::1')).toEqual(['0', '0', '0', '0', '0', '0', '0', '1']);
  });

  it.each(['2001:db8::1::2', 'not-an-address', '2001:db8:1:2:3'])('refuses %s', (address) => {
    expect(expandIpv6(address)).toBeNull();
  });
});

describe('clientIpBucket', () => {
  it('takes the first entry, which is the client', () => {
    expect(clientIpBucket(headers({ 'x-forwarded-for': '203.0.113.5, 70.0.0.1' }))).toBe(
      '203.0.113.5',
    );
  });

  it('falls back to x-real-ip', () => {
    expect(clientIpBucket(headers({ 'x-real-ip': '203.0.113.5' }))).toBe('203.0.113.5');
  });

  it('gives one IPv6 subscriber one bucket', () => {
    expect(clientIpBucket(headers({ 'x-forwarded-for': '2001:db8:abcd:1::1' }))).toBe(
      clientIpBucket(headers({ 'x-forwarded-for': '2001:db8:abcd:1::ffff' })),
    );
  });

  it('keeps separate /64s apart', () => {
    expect(clientIpBucket(headers({ 'x-forwarded-for': '2001:db8:abcd:1::1' }))).not.toBe(
      clientIpBucket(headers({ 'x-forwarded-for': '2001:db8:abcd:2::1' })),
    );
  });

  it('reads the bracketed form with a port', () => {
    expect(clientIpBucket(headers({ 'x-forwarded-for': '[2001:db8::1]:4000' }))).toBe(
      '2001:db8:0:0',
    );
  });

  it('has one bucket for a request with no address, so the other limits still apply', () => {
    expect(clientIpBucket(headers({}))).toBe('unknown');
  });
});
