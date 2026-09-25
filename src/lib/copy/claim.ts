// src/lib/copy/claim.ts

/**
 * Strings for the claim screen that the check's own messages don't cover: the cards, the steps
 * while they run, the timer, the tooltips and the verified card. Failure text still comes from
 * `claimCopy` in `lib/claims/messages.ts`.
 */
export const claimScreenCopy = {
  cards: {
    nameservers: '01 · Nameservers',
    record: '02 · Record',
    check: '03 · Check',
    verified: '04 · Verified',
  },
  badge: {
    queued: 'Queued',
    running: 'Running',
    done: 'Done',
    waiting: 'Waiting',
    needsYou: 'Needs you',
    live: 'Live',
    output: 'Output',
    atRisk: 'At risk',
    txt: 'TXT',
  },
  /** What a step says while it runs, and before it has run. */
  running: {
    zone: 'Looking up the zone',
    nameservers: 'Asking the nameservers',
    record: 'Looking for the record',
    token: 'Comparing the value',
    claim: 'Saving the claim',
  },
  queued: 'Queued',

  header: {
    release: 'Release claim',
    openDns: (host: string) => `Open ${host} DNS`,
    claimed: (day: string) => `Claimed ${day}`,
    verified: (day: string) => `Verified ${day}`,
    dnsAt: (host: string) => `DNS at ${host}`,
    validUntil: (day: string) => `Record valid until ${day}`,
  },

  record: {
    your: 'Your',
    nameservers: 'nameservers',
    areAt: 'are at',
    addThere: 'Add the record there.',
    addAtProvider: 'Add this record at your DNS provider.',
    addIn: (host: string) => `Add in ${host}`,
  },

  timer: {
    checkingNow: 'Checking now',
    next: (seconds: number) => `Next check in ${seconds}s`,
    last: (ago: string) => `last checked ${ago}`,
    checked: (ago: string) => `Checked ${ago}`,
    stopped: 'Automatic checks stopped after 15 minutes',
    stoppedShort: 'Automatic checks stopped',
  },

  ago: {
    now: 'just now',
    seconds: (n: number) => `${n}s ago`,
    minutes: (n: number) => `${n} min ago`,
  },

  result: {
    /** Replaces an expired token with a new one, on the same claim. */
    newRecord: 'Get a new record',
    gettingRecord: 'Getting a new record',
    /** Check now while the check limit holds. */
    limitReached: 'Check limit reached',
    resumesAt: (time: string) => `Checks resume at ${time}`,
    checking: (name: string) => `Checking ${name}`,
    checkingText: (host: string) =>
      `We ask ${host} directly, so there's no cache in the way. Each step shows what it found as it lands.`,
    checkingTextUnknown:
      "We ask your nameservers directly, so there's no cache in the way. Each step shows what it found as it lands.",
    asking: 'Asking',
    lookingFor: 'Looking for',
    expecting: 'Expecting',
    nameservers: (host: string) => `${host} nameservers`,
    token: (tail: string) => `token …${tail}`,
    waitingTitle: 'No record found yet',
    waitingText: 'New records usually appear within a few minutes of saving.',
    findRegistrar: 'Find your registrar',
    copyValue: 'Copy value',
  },

  verified: {
    title: (name: string) => `${name} is verified`,
    /** Softened until verified claims are checked on a schedule. */
    line: 'Keep the TXT record in place. Removing it puts the claim at risk.',
    riskTitle: 'Verified, now at risk',
    riskLine: (when: string, name: string) =>
      `The record is missing since ${when}. Add it back to keep ${name}.`,
    back: 'Back to domains',
  },

  /** The bold word that opens each tooltip. */
  tipTerms: {
    TXT: 'TXT',
    Name: 'Name',
    Value: 'Value',
    TTL: 'TTL',
    nameservers: 'Nameservers',
    zone: 'Zone',
  },
  tips: {
    TXT: 'A text record. DNS can hold short notes like this one. We read it to confirm you control the domain.',
    Name: 'Where the record lives. Most panels add your domain to the end for you, so paste only this part.',
    Value: 'The text we look for. Paste it exactly, with no quotes or extra spaces.',
    TTL: 'How long other servers cache the record. A lower number means we see your change sooner.',
    nameservers:
      'The servers that answer DNS questions for your domain. Your DNS panel is wherever they point.',
    zone: 'The set of DNS records for your domain, managed in one place by your DNS provider.',
  },
} as const;
