// src/lib/claims/steps.ts
import type { ClaimOutcome } from '@/lib/claims/check';
import { claimCopy, describeFailure, type FailureMessage, formatWhen } from '@/lib/claims/messages';
import { describeProvider } from '@/lib/claims/provider';
import { holdsTheName } from '@/lib/claims/state';
import { serverResponded } from '@/lib/dns/trace';

export const STEP_KEYS = ['zone', 'nameservers', 'record', 'token', 'claim'] as const;

export type StepKey = (typeof STEP_KEYS)[number];

/**
 * Three states, and the rule that sorts them is whose move is next.
 *
 * `wrong` means the person has to change something: a record saved under the wrong type, a value
 * pasted with an end missing, nameservers never set. `wait` means time has to pass: the record has
 * not been added, the servers did not answer inside the deadline, the write failed. Reloading later
 * is a real remedy for a wait and not for a wrong, which is the whole difference.
 *
 * `idle` is a step the check never reached. Not a failure, and the reason the sequence carries
 * information: it says how far the check got before it ran out of answers.
 */
export type StepState = 'done' | 'wait' | 'wrong' | 'idle';

export type CheckStep = {
  key: StepKey;
  state: StepState;
  /** What the check learned here, in a few words. */
  answer: string;
  /** Only on a step that needs the person. The same four parts as every other failure. */
  fix: FailureMessage | null;
};

const idle = (key: StepKey): CheckStep => ({
  key,
  state: 'idle',
  answer: claimCopy.steps.notReached,
  fix: null,
});

/**
 * The five steps of one check, derived from what the trace and the comparison already hold.
 *
 * Pure, so the screen and its tests read the same value. Nothing here asks DNS anything; this is a
 * second reading of a check that has already finished.
 */
export const stepsFor = (outcome: ClaimOutcome): CheckStep[] => {
  const { trace, result, status, verifiedAt, provedButHeld } = outcome;
  const copy = claimCopy.steps;

  // An expired claim is decided from the row before any query, so there is no trace to read and no
  // step got as far as being asked.
  if (trace === null) {
    return [
      { key: 'zone', state: 'wrong', answer: copy.zone.expired, fix: failureOf(result) },
      idle('nameservers'),
      idle('record'),
      idle('token'),
      idle('claim'),
    ];
  }

  if (trace.zone === null) {
    const none: CheckStep = {
      key: 'zone',
      state: 'wrong',
      answer: copy.zone.none,
      fix: failureOf(result),
    };
    return [none, idle('nameservers'), idle('record'), idle('token'), idle('claim')];
  }

  // `describeProvider` reads the first nameserver and has none to read when the list is empty. A
  // zone that answered with NS records should always have one, so this is the unlikely branch
  // rather than the impossible one, and it still has something true to say.
  const provider = describeProvider(trace.nameservers);
  const zone: CheckStep = {
    key: 'zone',
    state: 'done',
    answer:
      provider === null
        ? copy.zone.foundUnnamed(trace.zone)
        : copy.zone.found(trace.zone, trace.nameservers.length, provider.name),
    fix: null,
  };

  // Reachability is the trace's own verdict, not "did anyone hand us records". A server answering
  // NXDOMAIN was reached and had nothing, which is step 03's answer rather than step 02's. Asking
  // the wrong question here put the record's message on the nameserver row.
  if (trace.outcome.status === 'nameservers_unreachable') {
    const silent: CheckStep = {
      key: 'nameservers',
      state: 'wait',
      answer: copy.nameservers.silent,
      fix: failureOf(result),
    };
    return [zone, silent, idle('record'), idle('token'), idle('claim')];
  }

  const responder = trace.servers.find((server) => serverResponded(server.result));
  const nameservers: CheckStep = {
    key: 'nameservers',
    state: 'done',
    answer:
      responder === undefined
        ? copy.nameservers.answeredUnnamed
        : copy.nameservers.answered(responder.nameserver),
    fix: null,
  };

  const record = recordStep(outcome);
  if (record.state !== 'done') {
    return [zone, nameservers, record, idle('token'), idle('claim')];
  }

  const token = tokenStep(outcome);
  if (token.state !== 'done') {
    return [zone, nameservers, record, token, idle('claim')];
  }

  return [zone, nameservers, record, token, claimStep(status, verifiedAt, provedButHeld)];
};

const failureOf = (result: ClaimOutcome['result']): FailureMessage | null =>
  result.status === 'failed' ? describeFailure(result.reason) : null;

const recordStep = ({ trace, result }: ClaimOutcome): CheckStep => {
  const copy = claimCopy.steps.record;

  if (trace !== null && trace.outcome.status === 'records_found') {
    return {
      key: 'record',
      state: 'done',
      answer: copy.found(trace.outcome.records.length),
      fix: null,
    };
  }

  // A name that exists with no TXT on it is the person's to fix. A name with nothing at it on a
  // claim nobody has acted on is the expected state, so it waits rather than failing.
  if (result.status === 'failed' && result.reason.code === 'no_txt_at_name') {
    return { key: 'record', state: 'wrong', answer: copy.wrongType, fix: failureOf(result) };
  }

  // Nothing at the name and the record one level down. The person has to move it, so this is theirs
  // rather than time's.
  if (result.status === 'failed' && result.reason.code === 'appended_zone_suspected') {
    return { key: 'record', state: 'wrong', answer: copy.appended, fix: failureOf(result) };
  }

  return { key: 'record', state: 'wait', answer: copy.none, fix: failureOf(result) };
};

const tokenStep = ({ result }: ClaimOutcome): CheckStep => {
  const copy = claimCopy.steps.token;

  if (result.status === 'verified') {
    return { key: 'token', state: 'done', answer: copy.matched(result.answeredBy), fix: null };
  }

  if (result.reason.code === 'token_expired') {
    return { key: 'token', state: 'wrong', answer: copy.expired, fix: failureOf(result) };
  }

  return { key: 'token', state: 'wrong', answer: copy.mismatch, fix: failureOf(result) };
};

const claimStep = (
  status: ClaimOutcome['status'],
  verifiedAt: Date | null,
  provedButHeld: boolean,
): CheckStep => {
  const copy = claimCopy.steps.claim;

  if (provedButHeld) {
    return {
      key: 'claim',
      state: 'wrong',
      answer: copy.heldByAnother,
      fix: { ...claimCopy.check.provedButHeld, record: null, copyable: null },
    };
  }

  if (status === 'verified' && verifiedAt !== null) {
    return {
      key: 'claim',
      state: 'done',
      answer: copy.recorded(formatWhen(verifiedAt)),
      fix: null,
    };
  }

  // A claim that already holds its name proving itself again. Nothing to write.
  if (holdsTheName(status)) {
    return { key: 'claim', state: 'done', answer: copy.alreadyHeld, fix: null };
  }

  // Control proved and the row did not move, which is a database outage rather than a state. Time
  // is the remedy, so nothing is asked of the person.
  return { key: 'claim', state: 'wait', answer: copy.notRecorded, fix: null };
};

/** How many of the five the check got an answer to. Not reached is not an answer. */
export const answeredCount = (steps: CheckStep[]): number =>
  steps.filter((step) => step.state !== 'idle').length;

/** The step that stopped the check, which is the only one carrying anything to act on. */
export const stoppedAt = (steps: CheckStep[]): CheckStep | null =>
  steps.find((step) => step.state === 'wrong' || step.state === 'wait') ?? null;

/**
 * Whether anything here is worth taking the page's attention for.
 *
 * A check that found nothing and found nothing wrong is the one silent case: a claim nobody has
 * added a record for yet. Everything else, including a failure before the record was ever looked
 * for, opens the chain, because a broken zone should not be hidden from someone about to spend ten
 * minutes adding a record that can never answer.
 */
export const needsAttention = (steps: CheckStep[]): boolean => {
  const stopped = stoppedAt(steps);
  if (stopped === null) {
    return true;
  }
  return !(stopped.key === 'record' && stopped.state === 'wait');
};
