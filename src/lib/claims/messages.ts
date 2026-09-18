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
    empty: 'The name that will be claimed appears here.',
    tooMany: {
      title: 'Claim limit reached',
      description: 'This account has reached the number of claims allowed per hour.',
      action: 'Release a claim you no longer need, or try again later.',
    },
    unavailable: {
      title: 'The claim could not be created',
      description: 'A server error stopped the claim from being saved.',
      action: 'Try again in a moment.',
    },
    invalid: {
      title: 'The name could not be read',
      description: 'The submitted value is not a valid domain.',
      action: 'Enter the domain again.',
    },
  },

  /** Only rendered where the demo namespace is switched on. Off, `.test` is refused at input. */
  demo: {
    heading: 'Demo names',
    description:
      'These names resolve against a scripted resolver, so every outcome can be reached without a real domain. Claim one like any other name.',
    /** Column headings for the table of names. */
    columns: { name: 'Name', outcome: 'Outcome', script: 'What the resolver does' },
    /** What each name is scripted to do, so the outcome can be checked against the screen. */
    outcome: {
      'verified.test': { tone: 'good', label: 'Verifies', line: 'on the first check.' },
      'record-not-found.test': {
        tone: 'neutral',
        label: 'Waits',
        line: 'the zone answers and has no record at the name.',
      },
      'no-txt-at-name.test': {
        tone: 'attention',
        label: 'Needs a change',
        line: 'the name exists with no TXT record on it.',
      },
      'appended-zone.test': {
        tone: 'attention',
        label: 'Needs a change',
        line: 'the record is at the name with the zone appended a second time.',
      },
      'nameservers-unreachable.test': {
        tone: 'neutral',
        label: 'Waits',
        line: 'no nameserver answers inside the deadline.',
      },
      'zone-not-found.test': {
        tone: 'attention',
        label: 'Needs a change',
        line: 'no nameservers at any level.',
      },
      'one-dead-nameserver.test': {
        tone: 'good',
        label: 'Verifies',
        line: 'one of three servers hangs, the other two answer, no warning.',
      },
      'crowded-name.test': {
        tone: 'good',
        label: 'Verifies',
        line: 'our record sits beside an SPF record and a Google one at the same name.',
      },
      'value-mismatch.test': {
        tone: 'attention',
        label: 'Needs a change',
        line: 'a TXT record is there with another token.',
      },
      'slow-nameservers.test': {
        tone: 'neutral',
        label: 'Waits',
        line: 'the servers are alive and slower than the deadline.',
      },
    } as Record<string, { tone: 'good' | 'neutral' | 'attention'; label: string; line: string }>,
  },

  /** The domain list. Every claim this account has, with no check run on any of them. */
  list: {
    nav: 'Domains',
    heading: 'Domains',
    intro: 'All claims on this account, both pending and verified.',
    claim: 'Claim a domain',
    /** Re-reads the list. It says refresh whatever it reads, since that is what a person expects. */
    refresh: 'Refresh',
    refreshing: 'Refreshing',
    /**
     * Under the control, so what Refresh does is said before it is pressed. Found 2026-09-16:
     * after deleting a record, Refresh left the row where it was, because the list reflects the
     * last check and no check had run. Without this line the button reads as broken.
     */
    refreshNote: 'Reloads the list. A claim is checked on its own screen.',
    /** The chips above the list. Each one is the word on a pill, so they need no copy of their own. */
    filter: {
      label: 'Filter by status',
      all: 'All',
      none: (label: string) => `No ${label.toLowerCase()} claims.`,
    },
    sort: {
      label: 'Sort',
      attention: 'Needs attention first',
      newest: 'Newest first',
      name: 'Name A to Z',
    },
    /** Above the list whenever a row needs the person. Stated in words, since a sort can hide it. */
    attention: {
      count: (n: number) => (n === 1 ? '1 claim needs attention.' : `${n} claims need attention.`),
      show: 'Show',
    },
    /** The row menu. The name is in the label because every row has one of these. */
    actions: (name: string) => `Actions for ${name}`,
    open: 'Open',
    empty: {
      title: 'No claims yet',
      description: 'Claims appear here as soon as they are started.',
    },
  },

  /**
   * The claim's own state, read from the row rather than from the check. The row carries it before
   * the check runs, so the page renders this and the check's answer replaces it.
   */
  status: {
    pending: {
      label: 'Pending',
      line: 'Not yet verified.',
    },
    verified: {
      label: 'Verified',
      line: (when: string | null) =>
        when === null ? 'Verified for this account.' : `Verified for this account since ${when}.`,
    },
    actionNeeded: {
      label: 'Action needed',
      line: 'A record at this name does not match this claim.',
      /** The list detail, after the pill, like the at-risk one. */
      since: (day: string) => `since ${day}`,
    },
    atRisk: {
      label: 'At risk',
      line: 'The TXT record is no longer found. The claim stays verified until the record is restored or the claim is released.',
      /**
       * The list's only detail line. It sits after the pill and reads on from it, so it carries a
       * date and no second copy of the word the pill has already said.
       *
       * The full timestamp with its UTC suffix, like every other date in the product. A date on
       * its own would be read locally and lands a day out either side of midnight.
       *
       * No reason in it. Nothing is stored about why a check failed, and the date is the part a
       * row can be sure of.
       */
      since: (day: string) => `since ${day}`,
    },
    contested: {
      label: 'Contested',
      line: 'Another account has verified control of this name.',
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
      line: 'The token expired before the claim was verified.',
    },
    provedButHeld: {
      label: 'Control proved',
      line: 'The record matches. Another account currently holds this name.',
    },
    /** Said once the check has run, so it can name the server that answered. */
    proved: (nameserver: string, when: string) => `Verified at ${when} by ${nameserver}.`,
    stillHeld:
      'The TXT record is no longer found. The claim stays verified until the record is restored or the claim is released.',
    /**
     * Said on the one check that finds the record of an at-risk name again.
     *
     * The state going quietly back to Verified would leave the person who fixed their zone
     * watching a screen that says nothing about what they just did, which is the same ambiguity
     * the chain never disappearing is there to avoid.
     */
    recovered: (nameserver: string) =>
      `${nameserver} returned the record. The claim is no longer at risk.`,
  },

  record: {
    heading: 'Add this record',
    /** A claim that already holds its name has done this work, so the card becomes a disclosure. */
    headingHeld: 'Show the record',
    intro: (name: string) => `Add this TXT record to the DNS for ${name}.`,
    typeLabel: 'Type',
    nameLabel: 'Name',
    nameHint:
      'Paste the short form. Most DNS panels append your domain to this field. Some panels call it Host.',
    fullNameSummary: 'My panel does not add the domain for me',
    fullNameHint: 'Use this if your panel leaves the field exactly as typed.',
    valueLabel: 'Value',
    valueHint: 'Token and expiry, in one value.',
    ttlLabel: 'TTL',
    /**
     * Not a value to copy. Squarespace offers TTL as a dropdown defaulting to 4 hrs, measured
     * 2026-09-13, so a number here is advice that cannot be followed. Leaving the default alone is
     * true on every panel.
     */
    ttlValue: 'Leave the default',
    ttlHint: 'Any value works. TTL does not affect verification.',
    copy: 'Copy',
    copied: 'Copied',
    expiry: (when: string) =>
      `This token expires on ${when}. Claiming the name again after that date issues a new one.`,
    /**
     * The same date on a claim that already holds its name. Verifying does not clear `expires_at`,
     * so every name held for longer than the token's seven days carries an expiry in the past, and
     * that date is visible in the record value being compared against the panel.
     */
    heldExpiry: (when: string) =>
      `The date in the record value, ${when}, was the verification deadline. It no longer applies to a verified claim.`,
    existing: 'This account already has a claim on this name.',
    reissued:
      'The previous token expired and a new one was issued. The value below has changed; the old record no longer matches.',
    challenger: (name: string) =>
      `Another account currently holds ${name}. Adding this record verifies your control of the DNS. It does not transfer the name.`,
    provider: {
      recognized: (name: string) =>
        `DNS for this domain is at ${name}. Add the record there, which may be a different company from your registrar.`,
      unrecognized: (name: string) =>
        `Nameservers: ${name}. Add the record in that DNS panel, which may be a different company from your registrar.`,
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
    notReached: 'not reached',
    /** Read out after the label. The glyph says this to a sighted reader and to nobody else. */
    state: {
      done: 'done',
      wait: 'waiting',
      wrong: 'needs a change',
      idle: 'not reached',
    },
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
      expired: 'skipped, token expired',
    },
    nameservers: {
      answered: (nameserver: string) => `${nameserver} answered`,
      answeredUnnamed: 'they answered',
      silent: 'none of them answered in time',
    },
    record: {
      found: (n: number) => `${n === 1 ? '1 TXT record' : `${n} TXT records`} at the name`,
      none: 'no record at this name yet',
      gone: 'the verified record is missing',
      wrongType: 'name exists, no TXT record',
      appended: 'not here; found one level down',
    },
    token: {
      matched: (nameserver: string) => `matched on ${nameserver}`,
      mismatch: 'no value matches this token',
      expired: 'the token expired before this check',
    },
    claim: {
      recorded: (when: string) => when,
      alreadyHeld: 'already held by this account',
      notRecorded: 'verified, not yet saved',
      heldByAnother: 'another account holds this name',
    },
    /**
     * Shown when the chain is closed, which is when there is nothing to act on.
     *
     * No time in it. When the check ran and when it will run again are next to the control that
     * asks again, which is where someone waiting on a record is already looking.
     */
    summary: (through: string) => `${through}.`,
    summaryThrough: 'Zone and nameservers found. No record at this name yet',
  },

  /** Read out by the fallback each route shows while its own page is still on the server. */
  loading: {
    list: 'Loading your domains',
    claim: 'Loading the claim form',
    record: 'Loading this claim',
  },

  check: {
    running: 'Checking nameservers',
    /**
     * The person who has just added the record and does not want to wait for the next check. The
     * product runs the check either way, which is what `waiting` says beside this, so this button
     * skips a wait rather than being the thing that starts a check.
     */
    now: 'Check now',
    checking: 'Checking',
    checkedAt: (since: string) => `Checked ${since}`,
    waiting: (since: string) => `Checked ${since}. Checks again shortly.`,
    stopped: (after: string) => `Automatic checks stopped after ${after}`,
    limited: {
      title: 'Check limit reached',
      description: 'Checks for this claim are rate limited to protect the nameservers.',
      action: 'Wait a minute, then press Check now.',
    },
    unavailable: {
      title: 'The check could not run',
      description: 'A server error stopped the check before DNS was queried.',
      action: 'Press Check now in a moment.',
    },
    offline: {
      title: 'The check did not complete',
      description: 'The request failed, usually because the connection dropped.',
      action: 'Press Check now once you are back online.',
    },
    signedOut: {
      title: 'Signed out',
      description: 'The session has ended, so the check was refused.',
      action: 'Reload this page to sign in again.',
    },
    missing: {
      title: 'Claim not found',
      description: 'It was released, or belongs to another account.',
      action: 'Reload this page.',
    },
    /** Rendered with the lead in bold. It is the one warning on a screen that is otherwise good news. */
    keepRecord: {
      lead: 'Keep the TXT record in place.',
      rest: 'It is checked periodically. Removing it puts the claim at risk.',
    },
    provedButHeld: {
      title: 'Control verified. Another account holds this name.',
      description:
        'The record matches. A name is held by one account at a time, and transfers are not yet supported.',
      action: 'Leave the record in place.',
    },
  },

  release: {
    trigger: 'Release this claim',
    title: 'Release this claim',
    description: (name: string) =>
      `This deletes the claim on ${name} and its token. The name can then be claimed by anyone.`,
    removeRecord: (host: string) =>
      `The TXT record remains in your DNS. Delete ${host} after releasing.`,
    confirm: 'Release claim',
    cancel: 'Cancel',
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
  failingSince: Date | null;
  actionNeededSince: Date | null;
};

/**
 * A row's message, plus the one detail a row carries beside the pill.
 *
 * `detail` is filled for `at_risk` and nothing else. How long a name has been failing is the thing
 * the status word leaves out and the thing a person weighs, and it is the number the grace window
 * will count from once there is a schedule to run it. Every other state either has nothing a date
 * would add or has it on the record screen, where it can be acted on.
 */
export type ClaimRowMessage = StatusMessage & { detail: string | null };

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
export const describeClaimRow = (claim: ClaimRow, now: Date = new Date()): ClaimRowMessage => {
  if (claim.status === 'pending' && isExpired(claim, now)) {
    return {
      label: claimCopy.status.expired.label,
      line: claimCopy.status.expired.line,
      tone: 'attention',
      detail: null,
    };
  }

  // A pending claim whose last check found a wrong record. Expired takes precedence above, because
  // an expired claim needs a new token before its record matters. The person's move, so it carries
  // the attention tone, the same rule the record screen and the check steps use.
  if (claim.status === 'pending' && claim.actionNeededSince !== null) {
    return {
      label: claimCopy.status.actionNeeded.label,
      line: claimCopy.status.actionNeeded.line,
      tone: 'attention',
      detail: claimCopy.status.actionNeeded.since(formatWhen(claim.actionNeededSince)),
    };
  }

  const message = describeStatus(claim.status, claim.verifiedAt);

  // The column is null on every other status, and it is null on an at-risk row written before this
  // column existed, so the detail is dropped rather than guessed at.
  if (claim.status === 'at_risk' && claim.failingSince !== null) {
    return { ...message, detail: claimCopy.status.atRisk.since(formatWhen(claim.failingSince)) };
  }

  return { ...message, detail: null };
};

/**
 * The status block once the check has spoken. `extra` is a second line, or nothing. A line with a
 * `lead` is a warning and is rendered as one, with the lead in bold.
 */
export type ExtraLine = { lead: string | null; rest: string };
export type ClaimMessage = StatusMessage & { extra: ExtraLine | null };

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
  recovered: boolean;
  actionNeeded: boolean;
}): ClaimMessage => {
  const { result, recovered, status, verifiedAt, provedButHeld, actionNeeded } = outcome;

  // Ahead of the verified branch below, which would say the name was proved a moment ago. It was
  // proved whenever it was first proved, and what changed here is the record answering again.
  if (recovered && result.status === 'verified') {
    return {
      label: claimCopy.status.verified.label,
      line: claimCopy.status.recovered(result.answeredBy),
      extra: claimCopy.check.keepRecord,
      tone: 'good',
    };
  }

  if (provedButHeld) {
    return {
      label: claimCopy.status.provedButHeld.label,
      line: claimCopy.status.provedButHeld.line,
      extra: { lead: null, rest: claimCopy.check.provedButHeld.action },
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

  // A pending failure splits by whose move is next, the same rule the list and the steps use. A
  // wrong record is the person's move and reads as attention; a name still waiting on its record
  // stays neutral, so the pill agrees with the waiting ring in the chain below rather than
  // colouring every unfinished claim as a problem.
  if (actionNeeded) {
    return {
      label: claimCopy.status.actionNeeded.label,
      line: describeFailure(result.reason).title,
      extra: null,
      tone: 'attention',
    };
  }

  return { ...row, line: describeFailure(result.reason).title, extra: null };
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
 * Seven of the nine reasons in the RFC. The two that need the DoH leg to be told apart from these
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
          : ` Public resolvers cache a missing record for up to ${reason.negativeTtlSeconds} seconds, so other tools may lag behind this check.`;

      // A record that was there and is gone. Saying "yet" to someone whose name verified from that
      // record describes a claim they finished weeks ago as one they have not started.
      if (context.held) {
        return {
          title: 'The record is missing',
          record: { label: 'Looked for', values: [reason.queriedName] },
          description: `The nameservers no longer return the record this claim was verified with. Common causes: a DNS migration, or a record removed during cleanup.${cacheNote}`,
          copyable: null,
          action: 'Add the record below back to your DNS panel.',
        };
      }

      return {
        title: 'No record found yet',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description: `The nameservers answered with no record at this name. Checks query them directly and repeat automatically, so a record is found as soon as your DNS provider publishes it, without the wait a public resolver adds.${cacheNote}`,
        copyable: null,
        action: 'Add the record below.',
      };
    }

    case 'no_txt_at_name':
      return {
        title: 'The name exists but has no TXT record',
        record: { label: 'Looked for', values: [reason.queriedName] },
        description:
          'The nameservers returned the name with no TXT record on it. Usually a record of another type, a CNAME, or a subdomain exists at this name.',
        copyable: null,
        action:
          'Check the existing records at this exact name in your DNS panel and add the TXT record beside them.',
      };

    case 'appended_zone_suspected':
      return {
        title: 'The record was saved with the domain appended twice',
        record: { label: 'Found at', values: [reason.foundAt] },
        description:
          'Most DNS panels append your domain to the Name field. Entering the full name there produces the domain twice.',
        copyable: null,
        action: 'Delete that record and add it again with the short name below.',
      };

    case 'value_mismatch':
      return {
        title: 'The TXT record has a different value',
        record: { label: 'Found', values: reason.found },
        description:
          'A TXT record exists at this name, but its value does not match this claim. Common causes: a partial paste, a typo, or a record from an earlier claim.',
        copyable: { label: claimCopy.record.valueLabel, value: reason.expected },
        action: 'Replace the value in your DNS panel with the one below.',
      };

    case 'token_expired':
      return {
        title: 'This claim has expired',
        record: { label: 'Expired', values: [formatWhen(reason.expiredAt)] },
        description: `Tokens are valid for ${TOKEN_TTL_DAYS} days. This one has passed its date, and the record in your DNS can no longer be verified.`,
        copyable: null,
        action: 'Release this claim and create a new one to get a new token.',
      };

    case 'nameservers_unreachable':
      return {
        title: 'Nameservers did not respond',
        record: { label: 'Asked', values: [...reason.attempted] },
        description: `None of them answered within ${formatDeadline(reason.timeoutMs)}. The zone may be down, slow, or pointed at the wrong nameservers. Checks repeat automatically, so a slow zone resolves on its own.`,
        copyable: null,
        action:
          'If this persists for more than a few minutes, check the nameservers set for the domain at your registrar.',
      };

    case 'zone_not_found':
      return {
        title: 'No nameservers found for this domain',
        record: { label: 'Asked at', values: [...reason.walked] },
        description:
          'DNS returned no nameservers for this domain. Either none are set at the registrar, or they were set within the last few minutes.',
        copyable: null,
        action:
          'Check the nameservers set for the domain at your registrar, and allow a few minutes if they were set recently.',
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
