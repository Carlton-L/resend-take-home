// src/lib/claims/messages.ts
import { SUGGESTED_TTL_SECONDS, TOKEN_TTL_DAYS } from '@/lib/claims/config';
import type { FailureReason } from '@/lib/claims/state';

/**
 * Every string the claim and record screens show, in one module, so the copy reads as a whole and
 * is asserted against the rules in one place.
 *
 * Each fact sits where it can be acted on. The zone append warning is at the host field, because
 * that is the field it ruins. The TTL consequence is at the TTL field. Expiry is stated once, next
 * to the value that carries it.
 */
export const claimCopy = {
  create: {
    submit: (name: string) => `Claim ${name}`,
    tooMany: {
      title: 'Too many claims from this account',
      description: 'This account has created more claims in the last hour than the limit allows.',
      action: 'Release a claim you are not using, or try again later.',
    },
    unavailable: {
      title: 'The claim could not be created',
      description: 'Something here failed before the claim was saved.',
      action: 'Try again in a moment.',
    },
    invalid: {
      title: 'That name could not be read',
      description: 'The name sent to the server did not survive being read back as a domain.',
      action: 'Enter the domain again.',
    },
  },

  /** Only rendered where the demo namespace is switched on. Off, `.test` is refused at input. */
  demo: {
    heading: 'Demo names',
    description:
      'These names route to a scripted resolver so each outcome is reachable without owning a broken domain. Claim one the same way as a real name.',
  },

  record: {
    heading: 'Add this record',
    intro: (name: string) => `One TXT record proves you control ${name}.`,
    hostLabel: 'Host',
    hostHint:
      'Most DNS panels put your domain on the end of this field for you, so paste the short form.',
    fullNameLabel: 'Full name',
    fullNameHint: 'Use this instead if your panel leaves the field exactly as typed.',
    typeLabel: 'Type',
    valueLabel: 'Value',
    valueHint: 'Copy the whole value. Both halves are read back.',
    ttlLabel: 'TTL',
    ttlHint: `Any value works. ${SUGGESTED_TTL_SECONDS} seconds only shortens how long a corrected value takes to agree in public resolvers.`,
    copy: 'Copy',
    copied: 'Copied',
    expiry: (when: string) =>
      `The token is good until ${when}. A claim that has not been proved by then needs a new one.`,
    existing: 'This account already had a claim on this name, so here it is.',
    reissued:
      'The token on this claim had expired, so a new one has been issued. The value below has changed and the old record no longer matches.',
    challenger: (name: string) =>
      `Another account currently holds ${name}. Adding this record proves you control the DNS, which is how a name changes hands. That decision is not built yet, so this claim does not take the name today.`,
    provider: {
      recognized: (name: string) =>
        `${name} answers for this domain, so the record goes in the panel there. That can be a different company from the one the domain was bought from.`,
      unrecognized: (name: string) =>
        `The nameservers for this domain are at ${name}, so the record goes in the panel there. That can be a different company from the one the domain was bought from.`,
    },
  },

  check: {
    running: 'Checking your nameservers',
    verifiedTitle: 'Verified',
    verifiedDescription: (nameserver: string, when: string) =>
      `${nameserver} returned the record at ${when}. This name is now held by this account.`,
    keepRecord:
      'Leave the record in place. It is re-checked from now on, and removing it puts the claim at risk.',
    stillHeld: {
      title: 'The record is not answering',
      description: (name: string) =>
        `${name} is still held by this account. The check just now did not find the record. A held name whose record stops answering is given a grace period before it is given up, and that period is not built yet, so nothing changes today.`,
      action: 'Put the record back if it was taken out.',
    },
    provedButHeld: {
      title: 'Control proved, and another account holds the name',
      description:
        'The record is in place and the value matches. One account at a time can hold a name, and moving one between accounts is a decision this product does not make yet.',
      action: 'Leave the record in place, since a transfer would be decided from it.',
    },
  },

  release: {
    trigger: 'Release this claim',
    title: 'Release this claim',
    description: (name: string) =>
      `This deletes the claim on ${name} and the token with it. Anyone can claim the name afterwards.`,
    removeRecord: (host: string) =>
      `The TXT record stays in your DNS until you take it out. Delete ${host} once this is done.`,
    confirm: 'Release claim',
    cancel: 'Keep it',
  },
} as const;

/**
 * A failure the user can act on: what went wrong, the DNS value it went wrong on, why, and the one
 * thing to do next. Same four parts as the input errors.
 */
export type FailureMessage = {
  title: string;
  record: { label: string; values: string[] } | null;
  description: string;
  /** Exactly one next action. */
  action: string;
};

/**
 * Six of the nine reasons in the RFC. The three that need the DoH leg to be told apart from these
 * arrive with it, and this switch is exhaustive so adding one to the union breaks the build until
 * it has a message.
 */
export const describeFailure = (reason: FailureReason): FailureMessage => {
  switch (reason.code) {
    case 'record_not_found': {
      const cacheNote =
        reason.negativeTtlSeconds === null
          ? ''
          : ` Public resolvers hold an absence for up to ${reason.negativeTtlSeconds} seconds, which is why other tools can lag behind this one.`;
      return {
        title: 'No record there yet',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description: `Your nameservers answered and had nothing at that name. This check asks them directly, so a record appears here as soon as you save it.${cacheNote}`,
        action: 'Add the record above, then reload this page.',
      };
    }

    case 'no_txt_at_name':
      return {
        title: 'The name exists with no TXT record on it',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description:
          'Your nameservers know the name and returned no TXT record for it. A record saved under the wrong type does this. So does a CNAME on the name, which this check cannot yet tell apart.',
        action: 'Open the record in your DNS panel and set its type to TXT.',
      };

    case 'value_mismatch':
      return {
        title: 'A TXT record is there with a different value',
        record: { label: 'Found', values: reason.found },
        description:
          'The name holds TXT records and none of them carry this token. A value pasted with an end missing looks like this, and so does a record left behind by an earlier claim.',
        action: 'Replace the value with the one above, copied whole.',
      };

    case 'token_expired':
      return {
        title: 'This claim has expired',
        record: { label: 'Expired', values: [formatWhen(reason.expiredAt)] },
        description: `The token was issued for ${TOKEN_TTL_DAYS} days and that time has passed. The record in your DNS no longer matches anything that can be verified.`,
        action: 'Release this claim and start a new one, which issues a fresh token.',
      };

    case 'nameservers_unreachable':
      return {
        title: 'No answer from the nameservers',
        record: { label: 'Asked', values: [...reason.attempted] },
        description: `None of them answered within ${reason.timeoutMs} milliseconds. A zone that is slow and a zone that is down look the same from here, so this on its own does not mean anything is broken.`,
        action: 'Reload this page in a few minutes.',
      };

    case 'zone_not_found':
      return {
        title: 'No nameservers found for this domain',
        record: { label: 'Asked at', values: [...reason.walked] },
        description:
          'Working up from the name, no level answered with nameservers. A domain registered without nameservers set does this, and so does one registered in the last few minutes.',
        action: 'Set nameservers for the domain at your registrar, then reload this page.',
      };

    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
};

/**
 * One fixed locale and UTC, so the string is the same wherever it is rendered. A date formatted
 * from the viewer's locale on the server and again on the client is a hydration mismatch.
 */
export const formatWhen = (value: Date): string =>
  `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value)} UTC`;
