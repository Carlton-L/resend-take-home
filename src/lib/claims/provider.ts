// src/lib/claims/provider.ts
import { getDomain } from 'tldts';

/**
 * Who answers for a zone, read from its NS records.
 *
 * This names the DNS host rather than the registrar, and those are often different companies. The
 * record goes in the panel of whoever answers, so that is the one to name. carlton.dev is the
 * example: nameservers are Google, the registrar is Squarespace, and the record goes to Google.
 */
const PROVIDERS: { match: RegExp; name: string }[] = [
  { match: /(^|\.)googledomains\.com$/, name: 'Google' },
  { match: /(^|\.)google\.com$/, name: 'Google' },
  { match: /(^|\.)cloudflare\.com$/, name: 'Cloudflare' },
  { match: /(^|\.)awsdns-\d+\.(com|net|org|co\.uk)$/, name: 'Amazon Route 53' },
  { match: /(^|\.)domaincontrol\.com$/, name: 'GoDaddy' },
  { match: /(^|\.)registrar-servers\.com$/, name: 'Namecheap' },
  { match: /(^|\.)squarespacedns\.com$/, name: 'Squarespace' },
  { match: /(^|\.)vercel-dns\.com$/, name: 'Vercel' },
  { match: /(^|\.)netlify\.com$/, name: 'Netlify' },
  { match: /(^|\.)digitalocean\.com$/, name: 'DigitalOcean' },
  { match: /(^|\.)azure-dns\.(com|net|org|info)$/, name: 'Azure DNS' },
  { match: /(^|\.)nsone\.net$/, name: 'NS1' },
  { match: /(^|\.)dnsimple\.com$/, name: 'DNSimple' },
  { match: /(^|\.)dnsmadeeasy\.com$/, name: 'DNS Made Easy' },
  { match: /(^|\.)ultradns\.(com|net|org|biz|info)$/, name: 'UltraDNS' },
  { match: /(^|\.)akam\.net$/, name: 'Akamai' },
  { match: /(^|\.)dynect\.net$/, name: 'Dyn' },
  { match: /(^|\.)gandi\.net$/, name: 'Gandi' },
  { match: /(^|\.)ovh\.net$/, name: 'OVH' },
  { match: /(^|\.)hetzner\.(com|de)$/, name: 'Hetzner' },
  { match: /(^|\.)he\.net$/, name: 'Hurricane Electric' },
  { match: /(^|\.)name\.com$/, name: 'Name.com' },
  { match: /(^|\.)porkbun\.com$/, name: 'Porkbun' },
  { match: /(^|\.)hover\.com$/, name: 'Hover' },
  { match: /(^|\.)wixdns\.net$/, name: 'Wix' },
  { match: /(^|\.)shopify\.com$/, name: 'Shopify' },
];

export type Provider = {
  name: string;
  /** False when the name is the nameserver's own domain, because we did not recognise it. */
  recognized: boolean;
};

/**
 * Reads the first nameserver only. A zone served by two companies at once exists and is rare, and
 * the per-server rows in the trace are where that would show.
 */
export const describeProvider = (nameservers: readonly string[]): Provider | null => {
  const first = nameservers[0]?.toLowerCase().replace(/\.$/, '');
  if (first === undefined || first.length === 0) {
    return null;
  }

  for (const provider of PROVIDERS) {
    if (provider.match.test(first)) {
      return { name: provider.name, recognized: true };
    }
  }

  return { name: getDomain(first) ?? first, recognized: false };
};

/**
 * Where "Open DNS" goes for each host we link to. The account's landing page rather than a deep
 * link to the domain: these URLs are stable, and a deep link that changes breaks without anyone
 * noticing.
 *
 * Only hosts whose link has been opened and checked. Any other host gets no button.
 */
const PANEL_URLS: Readonly<Record<string, string>> = {
  Cloudflare: 'https://dash.cloudflare.com/',
  Namecheap: 'https://ap.www.namecheap.com/domains/list/',
  Squarespace: 'https://account.squarespace.com/domains',
  GoDaddy: 'https://dcc.godaddy.com/control/portfolio',
  'Amazon Route 53': 'https://console.aws.amazon.com/route53/v2/hostedzones',
  Vercel: 'https://vercel.com/dashboard/domains',
  Porkbun: 'https://porkbun.com/account/domainsSpeedy',
  DigitalOcean: 'https://cloud.digitalocean.com/networking/domains',
};

/** The DNS panel for a stored host name, or null when we don't link to that host. */
export const panelUrlFor = (dnsHost: string | null): string | null =>
  dnsHost === null ? null : (PANEL_URLS[dnsHost] ?? null);
