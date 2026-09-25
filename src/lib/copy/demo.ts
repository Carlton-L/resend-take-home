// src/lib/copy/demo.ts

/**
 * The words in the sign in demo that aren't the app's own. The demo plays one claim with made-up
 * names, so everything here is example data rather than something the app says.
 */
export const demoCopy = {
  user: 'carlton',
  name: 'acme.dev',
  host: 'Cloudflare',
  claimed: 'Claimed Sep 24 · DNS at Cloudflare · Record valid until Oct 1',
  listed: [
    { name: 'carlton.dev', host: 'Squarespace', status: 'verified', meta: 'Verified Sep 13' },
    { name: 'futurity.science', host: 'Namecheap', status: 'pending', meta: 'Checked 2 min ago' },
  ],
  answers: {
    zone: 'acme.dev, served by Cloudflare',
    nameservers: '2 of 2 answered in 38ms',
    recordWait: 'no claim record at this name yet',
    record: '1 claim record at the name',
    token: 'token matches',
    claim: 'acme.dev is yours',
  },
  token: 'domainclaim-token=Q8V3N6TK2MX9RW4PZ7HC5JBFDA expiry=2026-10-01T10:24:00Z',
  next: (seconds: number) => `Next check in ${seconds}s · last checked just now`,
  copied: 'Copied',
} as const;
