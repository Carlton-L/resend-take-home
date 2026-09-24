// src/lib/copy/domains.ts

/**
 * Strings for the app shell and the domains screen. The words on the status pills are the list's
 * labels from before the rebuild, and come from the row alone: the list runs no check, so it can
 * tell that a claim has a wrong record but not which one.
 */
export const domainsCopy = {
  brand: 'DomainClaim',
  heading: 'Domains',
  signOut: 'Sign out',

  input: {
    card: 'Claim a domain',
    badge: 'Input',
    label: 'Claim a domain',
    placeholder: 'acme.dev or https://acme.dev',
    submit: 'Claim',
    hint: 'Paste a URL or type a domain.',
    empty: 'Enter a domain to claim, like acme.dev.',
    willUse: "We'll use",
    asciiOf: (unicode: string) => `(the ASCII form of ${unicode}).`,
    exists: 'You already have this claim.',
    openIt: 'Open it.',
  },

  list: {
    card: 'Claims',
    empty: 'No claims yet. Claim a domain above to start.',
    dnsAt: (host: string) => `DNS at ${host}`,
    released: (name: string) => `Released ${name}. You can remove its TXT record from your DNS.`,
    dismiss: 'Dismiss',
  },

  sidebar: {
    label: 'Your claims',
    claim: 'Claim a domain',
    empty: 'No claims yet',
  },

  picker: {
    open: (name: string) => `Switch claim, current ${name}`,
  },

  /** A pill says the state. The text beside it says the one date that goes with it. */
  row: {
    pending: 'Pending',
    verified: 'Verified',
    actionNeeded: 'Action needed',
    atRisk: 'At risk',
    expired: 'Expired',
    contested: 'Contested',
    revoked: 'Revoked',
    checked: (ago: string) => `Checked ${ago}`,
    added: (ago: string) => `Added ${ago}`,
    verifiedOn: (day: string) => `Verified ${day}`,
    wrongSince: (day: string) => `Wrong record since ${day}`,
    missingSince: (when: string) => `Record missing since ${when}`,
    expiredOn: (day: string) => `Expired ${day}`,
  },

  ago: {
    now: 'just now',
    minute: 'a minute ago',
    minutes: (n: number) => `${n} min ago`,
    hour: 'an hour ago',
    hours: (n: number) => `${n} hours ago`,
    day: 'a day ago',
    days: (n: number) => `${n} days ago`,
  },
} as const;
