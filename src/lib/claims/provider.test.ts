// src/lib/claims/provider.test.ts
import { describe, expect, it } from 'vitest';
import { describeProvider } from '@/lib/claims/provider';

describe('describeProvider', () => {
  it.each([
    ['ns-cloud-a1.googledomains.com', 'Google'],
    ['abby.ns.cloudflare.com', 'Cloudflare'],
    ['ns-1234.awsdns-56.org', 'Amazon Route 53'],
    ['ns01.domaincontrol.com', 'GoDaddy'],
    ['dns1.registrar-servers.com', 'Namecheap'],
    ['ns1.squarespacedns.com', 'Squarespace'],
  ])('recognises %s as %s', (nameserver, expected) => {
    expect(describeProvider([nameserver])).toEqual({ name: expected, recognized: true });
  });

  // carlton.dev: nameservers are Google, the registrar is Squarespace. The record goes to Google,
  // so the nameserver is the thing to name.
  it('names the DNS host rather than the registrar', () => {
    expect(describeProvider(['ns-cloud-b1.googledomains.com'])?.name).toBe('Google');
  });

  it('falls back to the nameserver own domain when it is not one we know', () => {
    expect(describeProvider(['ns1.some-small-host.com'])).toEqual({
      name: 'some-small-host.com',
      recognized: false,
    });
  });

  it('ignores a trailing dot and upper case, both of which appear in real answers', () => {
    expect(describeProvider(['NS1.CLOUDFLARE.COM.'])).toEqual({
      name: 'Cloudflare',
      recognized: true,
    });
  });

  // A zone served by two companies at once is rare, and the per-server rows in the trace are
  // where that shows.
  it('reads the first nameserver only', () => {
    expect(describeProvider(['ns1.some-small-host.com', 'ns2.cloudflare.com'])).toEqual({
      name: 'some-small-host.com',
      recognized: false,
    });
  });

  it('has nothing to say when the zone returned no nameservers', () => {
    expect(describeProvider([])).toBeNull();
  });
});
