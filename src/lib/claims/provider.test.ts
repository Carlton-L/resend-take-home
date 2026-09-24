// src/lib/claims/provider.test.ts
import { describe, expect, it } from 'vitest';
import { describeProvider, panelUrlFor } from '@/lib/claims/provider';

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

describe('panelUrlFor', () => {
  it.each([
    ['abby.ns.cloudflare.com', 'https://dash.cloudflare.com/'],
    ['dns1.registrar-servers.com', 'https://ap.www.namecheap.com/domains/list/'],
    ['ns1.squarespacedns.com', 'https://account.squarespace.com/domains'],
    ['ns-1234.awsdns-56.org', 'https://console.aws.amazon.com/route53/v2/hostedzones'],
  ])('links the host behind %s to its panel', (nameserver, expected) => {
    expect(panelUrlFor(describeProvider([nameserver])?.name ?? null)).toBe(expected);
  });

  // carlton.dev's nameservers are Google's, and the panel depends on who sold the domain.
  it('gives no link for a host whose panel we have not checked', () => {
    expect(panelUrlFor('Google')).toBeNull();
  });

  it('gives no link for a host we do not recognize', () => {
    expect(panelUrlFor('some-small-host.com')).toBeNull();
  });

  it('gives no link when no nameservers were found', () => {
    expect(panelUrlFor(null)).toBeNull();
  });

  // The map is keyed by display name. A host renamed in PROVIDERS and not here would lose its link
  // without failing anything else.
  it('keys every link by a name the provider table produces', () => {
    const names = [
      'abby.ns.cloudflare.com',
      'dns1.registrar-servers.com',
      'ns1.squarespacedns.com',
      'ns01.domaincontrol.com',
      'ns-1234.awsdns-56.org',
      'ns1.vercel-dns.com',
      'curitiba.ns.porkbun.com',
      'ns1.digitalocean.com',
    ].map((nameserver) => describeProvider([nameserver])?.name ?? null);
    for (const name of names) {
      expect(panelUrlFor(name)).not.toBeNull();
    }
  });
});
