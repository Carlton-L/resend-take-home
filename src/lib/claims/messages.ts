// src/lib/claims/messages.ts
import { TOKEN_TTL_DAYS } from '@/lib/claims/config';
import { isExpired } from '@/lib/claims/evaluate';
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
    /** While the browser is posting the form and has not navigated yet. */
    submitting: 'Claiming',
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

  /** The domain list. Every claim this account has, with no check run on any of them. */
  list: {
    nav: 'Domains',
    heading: 'Domains',
    intro: 'Every name this account has claimed, including the ones still to be proved.',
    claim: 'Claim a domain',
    empty: {
      title: 'No claims yet',
      description:
        'A claim appears here as soon as it is created, before it has been proved, so a name you are part way through is always one click away.',
    },
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
    /**
     * Not a lifecycle state. A pending claim whose token has run out is still `pending` in the
     * database and is finished as far as the person is concerned, so the list says so.
     */
    expired: {
      label: 'Expired',
      line: 'The token on this claim ran out before it was proved.',
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
      'Most DNS panels put your domain on the end of this field for you, so paste the short form. Some panels call this field Host.',
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
      `Another account currently holds ${name}. Adding this record proves you control the DNS for it. One account holds a name at a time, so this claim does not take it.`,
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
      gone: 'the record that proved this name has gone',
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
    /**
     * Shown when the chain is closed, which is when there is nothing to act on.
     *
     * No time in it. When the check ran and when it will run again are next to the control that
     * asks again, which is where someone waiting on a record is already looking.
     */
    summary: (through: string) => `${through}.`,
    summaryThrough: 'Zone and nameservers found, no record at that name yet',
  },

  /** Read out by the fallback each route shows while its own page is still on the server. */
  loading: {
    list: 'Loading your domains',
    claim: 'Loading the claim form',
    record: 'Loading this claim',
  },

  check: {
    running: 'Checking your nameservers',
    /**
     * The person who has just added the record and does not want to wait for the next check. The
     * product runs the check either way, which is what `waiting` says beside this, so this button
     * skips a wait rather than being the thing that starts a check.
     */
    now: 'Check now',
    checking: 'Checking',
    checkedAt: (since: string) => `Checked ${since}`,
    waiting: (since: string) => `Checked ${since}, and again in a moment`,
    stopped: (after: string) => `Automatic checks stopped after ${after}`,
    limited: {
      title: 'This claim has been checked too often',
      description:
        'Every check sends queries to the nameservers for this name, so the number of them in a few minutes is capped.',
      action: 'Wait a minute, then press Check now.',
    },
    unavailable: {
      title: 'The check could not run',
      description: 'Something here failed before the nameservers were asked.',
      action: 'Press Check now in a moment.',
    },
    offline: {
      title: 'The check did not reach us',
      description:
        'The request failed before it got an answer, which is usually a dropped connection.',
      action: 'Press Check now once you are back online.',
    },
    signedOut: {
      title: 'This browser is no longer signed in',
      description: 'The check was refused because the session behind this page has ended.',
      action: 'Reload this page to sign in again.',
    },
    missing: {
      title: 'This claim is no longer here',
      description: 'It was released, or it belongs to a different account from the one signed in.',
      action: 'Reload this page.',
    },
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

/** The parts of a claim row a status message is built from. */
export type ClaimRow = {
  status: ClaimStatus;
  verifiedAt: Date | null;
  expiresAt: Date;
};

/**
 * What a row in the domain list says about a claim.
 *
 * The list runs no check, so every word here comes from the row. That is the lifecycle status
 * verbatim, plus the one thing the enum does not carry: a pending claim whose token has run out.
 *
 * `describeStatus` is left as it is rather than taught about expiry too. The record screen says it
 * a beat later, out of the check, with the four part message and the action attached. The list is
 * the only screen where nothing else will ever say it.
 *
 * The tone is the whole of the row's marker. Attention means the next move is the person's, which
 * is the same rule that sorts the check steps, applied to what a row on its own can know. A pending
 * claim inside its window is waiting on them adding a record, so it stays quiet.
 */
export const describeClaimRow = (claim: ClaimRow, now: Date = new Date()): StatusMessage => {
  if (claim.status === 'pending' && isExpired(claim, now)) {
    return {
      label: claimCopy.status.expired.label,
      line: claimCopy.status.expired.line,
      tone: 'attention',
    };
  }

  return describeStatus(claim.status, claim.verifiedAt);
};

/** The status block once the check has spoken. `extra` is a second line, or nothing. */
export type ClaimMessage = StatusMessage & { extra: string | null };

/**
 * What the top of the record screen says after a check.
 *
 * `describeStatus` above reads the claim row and is what the page shell can say with no waiting.
 * This reads the finished check and replaces it. The two are separate on purpose: the fallback
 * knows less, and pretending otherwise is how a claim ended up reporting PENDING above its own
 * verified result.
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
 * The same treatment for a window measured in minutes, sharing one list of spelled numbers with
 * the deadline above. The list stops at ten, so the fifteen minute window reads as digits, which
 * is the right register for a number that size anyway.
 */
export const formatMinutes = (milliseconds: number): string => {
  const minutes = Math.round(milliseconds / 60_000);
  const spelled =
    Number.isInteger(minutes) && minutes < SPELLED.length ? SPELLED[minutes] : minutes;
  return minutes === 1 ? 'one minute' : `${spelled} minutes`;
};

/**
 * How long ago the last check was, in the words a person waiting would use.
 *
 * Rendered on the client and re-rendered on a timer, which is the only reason it can be relative
 * at all. The server rendered this string once and it then sat on the screen saying "just now" for
 * as long as the page was open.
 *
 * Coarse on purpose. A second by second count is motion on a page where nothing is happening.
 */
export const formatSince = (milliseconds: number): string => {
  if (milliseconds < 45_000) {
    return 'just now';
  }
  const minutes = Math.round(milliseconds / 60_000);
  return minutes <= 1 ? 'a minute ago' : `${minutes} minutes ago`;
};

/** What a check knows about the claim that changes the words, rather than the reason. */
export type FailureContext = {
  /** The claim already holds this name, so a missing record is a loss rather than a beginning. */
  held: boolean;
};

/**
 * Six of the nine reasons in the RFC. The three that need the DoH leg to be told apart from these
 * arrive with it, and this switch is exhaustive so adding one to the union breaks the build until
 * it has a message.
 *
 * `context` carries the one thing the reason cannot: whether this claim already proved itself. The
 * same absent record means "not added yet" on a new claim and "taken out" on a name this account
 * holds, and the words for those are not the same.
 */
export const describeFailure = (
  reason: FailureReason,
  context: FailureContext = { held: false },
): FailureMessage => {
  switch (reason.code) {
    case 'record_not_found': {
      const cacheNote =
        reason.negativeTtlSeconds === null
          ? ''
          : ` Public resolvers hold an absence for up to ${reason.negativeTtlSeconds} seconds, which is why other tools can lag behind this one.`;

      // A record that was there and is gone. Saying "yet" to someone whose name verified from that
      // record describes a claim they finished weeks ago as one they have not started.
      if (context.held) {
        return {
          title: 'The record is no longer answering',
          record: { label: 'Looked for', values: [reason.queriedName] },
          description: `This name was proved from that record and your nameservers now have nothing at it. A DNS migration does this, and so does a panel tidied up by someone who did not know what the record was for.${cacheNote}`,
          copyable: null,
          action: 'Put the record below back in your DNS panel.',
        };
      }

      return {
        title: 'No record there yet',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description: `Your nameservers answered and had nothing at that name. This check asks them directly and runs again on its own, so a record appears here within seconds of you saving it.${cacheNote}`,
        copyable: null,
        action: 'Add the record below.',
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
        title: 'Still waiting on your nameservers',
        record: { label: 'Asked', values: [...reason.attempted] },
        description: `None of them answered within ${formatDeadline(reason.timeoutMs)}. A zone that is slow and a zone that is down look the same from here, and this page keeps asking, so a slow one clears itself.`,
        copyable: null,
        action:
          'If this does not clear, check the nameservers set for the domain at your registrar.',
      };

    case 'zone_not_found':
      return {
        title: 'No nameservers found for this domain',
        record: { label: 'Asked at', values: [...reason.walked] },
        description:
          'Working up from the name, no level answered with nameservers. A domain registered without nameservers set does this, and so does one registered in the last few minutes.',
        copyable: null,
        action: 'Set nameservers for the domain at your registrar.',
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
export const formatTime = (value: Date): string =>
  `${new Intl.DateTimeFormat('en-GB', {
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value)} UTC`;

export const formatWhen = (value: Date): string =>
  `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value)} UTC`;
