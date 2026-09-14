// src/lib/claims/messages.ts
import { TOKEN_TTL_DAYS } from '@/lib/claims/config';
import {
  type CheckResult,
  type ClaimStatus,
  type FailureReason,
  holdsTheName,
} from '@/lib/claims/state';

/**
 * Every string the claim and record screens show, in one module, so the copy reads as a whole and
 * is asserted against the rules in one place.
 *
 * Each fact sits where it can be acted on. The zone append warning is at the Name cell, because
 * that is the cell it ruins. Expiry is stated once, next to the value that carries it.
 */
export const claimCopy = {
  create: {
    submit: (name: string) => `Claim ${name}`,
    /** The card before there is a name in it. */
    nameToClaim: 'Name to claim',
    awaitingName: '\u2014',
    submitEmpty: 'Claim',
    empty:
      'Whatever you type is read back here, with anything that changed, before a claim is made.',
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

  /**
   * The claim's own state, read from the row rather than from the check. The row carries it before
   * the check runs, so this renders in the page shell while the check is still streaming.
   */
  status: {
    pending: {
      label: 'Pending',
      line: 'This claim has not been proved yet.',
    },
    verified: {
      label: 'Verified',
      line: (when: string | null) =>
        when === null
          ? 'This name is held by this account.'
          : `Held by this account since ${when}.`,
    },
    atRisk: {
      label: 'At risk',
      line: 'The record stopped answering. This account still holds the name for now.',
    },
    contested: {
      label: 'Contested',
      line: 'Another account has proved control of this name.',
    },
    revoked: {
      label: 'Revoked',
      line: 'This claim no longer holds the name.',
    },
    provedButHeld: {
      label: 'Control proved',
      line: 'The record is in place and the value matches. Another account holds this name.',
    },
    /** Said once the check has run, so it can name the server that answered. */
    proved: (nameserver: string, when: string) =>
      `${nameserver} returned the record at ${when}. Held by this account.`,
    stillHeld: 'The record stopped answering. This account still holds the name for now.',
  },

  record: {
    heading: 'Add this record',
    /** A claim that already holds its name has done this work, so the card becomes a disclosure. */
    headingHeld: 'Show the record',
    intro: (name: string) => `One TXT record proves you control ${name}.`,
    typeLabel: 'Type',
    nameLabel: 'Name',
    nameHint:
      'Most DNS panels put your domain on the end of this field for you, so paste the short form.',
    fullNameSummary: 'My panel does not add the domain for me',
    fullNameHint: 'Use this if your panel leaves the field exactly as typed.',
    valueLabel: 'Value',
    valueHint: 'Copy the whole value. Both halves are read back.',
    ttlLabel: 'TTL',
    /**
     * Not a value to copy. Squarespace offers TTL as a dropdown defaulting to 4 hrs, measured
     * 2026-09-13, so a number here is advice that cannot be followed. Leaving the default alone is
     * true on every panel.
     */
    ttlValue: 'Leave the default',
    ttlHint: 'Any value works. This does not affect the check.',
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
        `${name} answers for this domain, so the record goes in the panel there, which may not be your registrar.`,
      unrecognized: (name: string) =>
        `Your nameservers are at ${name}, so the record goes in the panel there, which may not be your registrar.`,
    },
  },

  /**
   * One line per step of the check, in the words the step map uses.
   *
   * Labels are steps rather than statements. "Record found" can only be true, so it fights its own
   * glyph on a step that is waiting or wrong. A step reads the same in all three states.
   */
  steps: {
    heading: 'What the check did',
    answered: (n: number) => `${n} of 5 answered`,
    more: 'what the check did',
    notReached: 'not reached',
    label: {
      zone: 'Find the zone',
      nameservers: 'Reach the nameservers',
      record: 'Find the TXT record',
      token: 'Match the token',
      claim: 'Record the claim',
    },
    zone: {
      found: (zone: string, count: number, provider: string) =>
        `${zone}, ${count === 1 ? '1 nameserver' : `${count} nameservers`} at ${provider}`,
      foundUnnamed: (zone: string) => `${zone}, nameservers found`,
      none: 'no nameservers for this domain',
      expired: 'not asked, the token had already expired',
    },
    nameservers: {
      answered: (nameserver: string) => `${nameserver} answered`,
      answeredUnnamed: 'they answered',
      silent: 'none of them answered in time',
    },
    record: {
      found: (n: number) => `${n === 1 ? '1 TXT record' : `${n} TXT records`} at the name`,
      none: 'no record at that name yet',
      wrongType: 'the name answers, with no TXT on it',
      appended: 'nothing here, and the record is one level down',
    },
    token: {
      matched: (nameserver: string) => `matched on ${nameserver}`,
      mismatch: 'no value there carries this token',
      expired: 'the token expired before this check',
    },
    claim: {
      recorded: (when: string) => when,
      alreadyHeld: 'already held by this account',
      notRecorded: 'proved, and not written down yet',
      heldByAnother: 'another account holds this name',
    },
    /** Shown when the chain is closed, which is when there is nothing to act on. */
    summary: (through: string) => `Checked just now. ${through}.`,
    summaryThrough: 'Zone and nameservers found, no record at that name yet',
  },

  check: {
    running: 'Checking your nameservers',
    keepRecord:
      'Leave the record in place. It is re-checked from now on, and removing it puts the claim at risk.',
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

/** What the top of the record screen says about the claim, before any check has run. */
export type StatusMessage = {
  label: string;
  line: string;
  /** Neutral for a settled state, good for held, attention for one the user has to weigh. */
  tone: 'neutral' | 'good' | 'attention';
};

/**
 * Exhaustive over the status enum, so a state added to `CLAIM_STATUSES` breaks the build until it
 * has something to say for itself.
 */
export const describeStatus = (status: ClaimStatus, verifiedAt: Date | null): StatusMessage => {
  switch (status) {
    case 'pending':
      return {
        label: claimCopy.status.pending.label,
        line: claimCopy.status.pending.line,
        tone: 'neutral',
      };

    case 'verified':
      return {
        label: claimCopy.status.verified.label,
        line: claimCopy.status.verified.line(verifiedAt === null ? null : formatWhen(verifiedAt)),
        tone: 'good',
      };

    case 'at_risk':
      return {
        label: claimCopy.status.atRisk.label,
        line: claimCopy.status.atRisk.line,
        tone: 'attention',
      };

    case 'contested':
      return {
        label: claimCopy.status.contested.label,
        line: claimCopy.status.contested.line,
        tone: 'attention',
      };

    case 'revoked':
      return {
        label: claimCopy.status.revoked.label,
        line: claimCopy.status.revoked.line,
        tone: 'neutral',
      };

    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
};

/** The status block once the check has spoken. `extra` is a second line, or nothing. */
export type ClaimMessage = StatusMessage & { extra: string | null };

/**
 * What the top of the record screen says after a check.
 *
 * `describeStatus` above reads the claim row and is what the page shell can say with no waiting.
 * This reads the finished check and replaces it. The two are separate on purpose: the fallback
 * genuinely knows less, and pretending otherwise is how a claim ended up reporting PENDING above
 * its own verified result.
 *
 * The failure title lands here rather than in a box of its own, so the top of the page says what is
 * true and the chain below says which of the five steps found it.
 */
export const describeClaim = (outcome: {
  result: CheckResult;
  status: ClaimStatus;
  verifiedAt: Date | null;
  provedButHeld: boolean;
}): ClaimMessage => {
  const { result, status, verifiedAt, provedButHeld } = outcome;

  if (provedButHeld) {
    return {
      label: claimCopy.status.provedButHeld.label,
      line: claimCopy.status.provedButHeld.line,
      extra: claimCopy.check.provedButHeld.action,
      tone: 'attention',
    };
  }

  const row = describeStatus(status, verifiedAt);

  if (result.status === 'verified') {
    return holdsTheName(status) || verifiedAt !== null
      ? {
          label: claimCopy.status.verified.label,
          line: claimCopy.status.proved(result.answeredBy, formatWhen(verifiedAt ?? new Date())),
          extra: claimCopy.check.keepRecord,
          tone: 'good',
        }
      : { ...row, extra: null };
  }

  // A claim that already holds its name and then fails a check is not a claim that was never
  // proved. The name is still theirs and the chain below says what stopped answering.
  if (holdsTheName(status)) {
    return { ...row, line: claimCopy.status.stillHeld, extra: null, tone: 'attention' };
  }

  return { ...row, line: describeFailure(result.reason).title, extra: null, tone: 'attention' };
};

/**
 * A failure the user can act on: what went wrong, the DNS value it went wrong on, why, and the one
 * thing to do next. Same four parts as the input errors.
 */
export type FailureMessage = {
  title: string;
  record: { label: string; values: string[] } | null;
  description: string;
  /**
   * A value the action tells the person to use. Rendered with a copy control, because an action
   * that says to replace a value and then makes them select it by hand is only half an action.
   */
  copyable: { label: string; value: string } | null;
  /** Exactly one next action. */
  action: string;
};

const SPELLED = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/**
 * A deadline as a person would say it. "2000 milliseconds" is the unit the code holds it in and
 * tells a reader nothing they can act on.
 */
export const formatDeadline = (milliseconds: number): string => {
  const seconds = milliseconds / 1000;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds >= SPELLED.length) {
    return `${seconds} seconds`;
  }
  return seconds === 1 ? 'one second' : `${SPELLED[seconds]} seconds`;
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
        copyable: null,
        action: 'Add the record below, then reload this page.',
      };
    }

    case 'no_txt_at_name':
      return {
        title: 'The name exists with no TXT record on it',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description:
          'A record saved under the wrong type does this, so does a CNAME, and so does a name that exists only because something sits below it.',
        copyable: null,
        action:
          'Check what your panel already has on that one name, since only this TXT record should be on it.',
      };

    case 'appended_zone_suspected':
      return {
        title: 'Your DNS panel added the domain to the name',
        record: { label: 'Found at', values: [reason.foundAt] },
        description:
          'Most panels put your domain on the end of their Name field, so a full name typed into that field becomes the domain twice.',
        copyable: null,
        action: 'Delete that record and add it again using the short name below.',
      };

    case 'value_mismatch':
      return {
        title: 'A TXT record is there with a different value',
        record: { label: 'Found', values: reason.found },
        description:
          'The name holds TXT records and none of them carry this token. A value pasted with an end missing looks like this, and so does a record left behind by an earlier claim.',
        copyable: { label: claimCopy.record.valueLabel, value: reason.expected },
        action: 'Replace the value in your DNS panel with this one.',
      };

    case 'token_expired':
      return {
        title: 'This claim has expired',
        record: { label: 'Expired', values: [formatWhen(reason.expiredAt)] },
        description: `The token was issued for ${TOKEN_TTL_DAYS} days and that time has passed. The record in your DNS no longer matches anything that can be verified.`,
        copyable: null,
        action: 'Release this claim and start a new one, which issues a fresh token.',
      };

    case 'nameservers_unreachable':
      return {
        title: 'No answer from the nameservers',
        record: { label: 'Asked', values: [...reason.attempted] },
        description: `None of them answered within ${formatDeadline(reason.timeoutMs)}. A zone that is slow and a zone that is down look the same from here, so this on its own does not mean anything is broken.`,
        copyable: null,
        action: 'Reload this page in a few minutes.',
      };

    case 'zone_not_found':
      return {
        title: 'No nameservers found for this domain',
        record: { label: 'Asked at', values: [...reason.walked] },
        description:
          'Working up from the name, no level answered with nameservers. A domain registered without nameservers set does this, and so does one registered in the last few minutes.',
        copyable: null,
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
