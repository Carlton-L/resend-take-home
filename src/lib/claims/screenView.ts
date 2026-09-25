// src/lib/claims/screenView.ts
import type { ClaimStatus } from '@/lib/claims/state';
import { holdsTheName } from '@/lib/claims/state';
import type { StepKey } from '@/lib/claims/steps';

/** The four cards, in order: 01 nameservers, 02 record, 03 check, 04 verified. */
export type CardIndex = 0 | 1 | 2 | 3;

type Step = { key: StepKey; state: string };

export type CardsInput = {
  status: ClaimStatus;
  steps: Step[];
  running: 'live' | 'background' | null;
  /** The record card has been shown this visit, so it stays. */
  recordShown: boolean;
  /** The check card has been shown this visit, so it stays. */
  checkShown: boolean;
};

export type Cards = {
  visible: [boolean, boolean, boolean, boolean];
  /** The card with the next action. Cards before it dim, cards after it aren't shown. */
  current: CardIndex;
};

const stopped = (step: Step | undefined) => step?.state === 'wait' || step?.state === 'wrong';

/**
 * Which cards the claim screen shows, and which one is current. Pure, so the rules are tests.
 *
 * Nameservers first. The record card once the nameservers are known. The check card once someone
 * presses Check now or a check finds something at the name. Verified once the row says so.
 */
export const cardsFor = (input: CardsInput): Cards => {
  const { status, steps, running, recordShown, checkShown } = input;
  const verifiedCard = status === 'verified' || status === 'at_risk';
  const visible: Cards['visible'] = [true, recordShown, checkShown, verifiedCard];

  if (!recordShown || stopped(steps[0]) || stopped(steps[1])) {
    return { visible, current: 0 };
  }
  if (status === 'verified') {
    return { visible, current: 3 };
  }
  // At risk goes back up to the record: adding it again is the move.
  if (status === 'at_risk' || !holdsTheName(status)) {
    if (running === 'live' && checkShown) {
      return { visible, current: 2 };
    }
    const record = steps[2]?.state;
    if (status !== 'at_risk' && checkShown && (record === 'wrong' || stopped(steps[3]))) {
      return { visible, current: 2 };
    }
    return { visible, current: 1 };
  }
  return { visible, current: 1 };
};

/** The record card shows from the start when the nameservers are already known. */
export const recordKnown = (claim: { status: ClaimStatus; dnsHost: string | null }): boolean =>
  claim.dnsHost !== null || holdsTheName(claim.status);

/** Steps 01 and 02 both passed. */
export const nameserversPassed = (steps: Step[]): boolean =>
  steps[0]?.state === 'done' && steps[1]?.state === 'done';

/** A check found something at the name, so the check card has something to say. */
export const checkFoundSomething = (steps: Step[]): boolean =>
  steps[2]?.state === 'done' || steps[2]?.state === 'wrong';

/**
 * Whether a check that ran on its own shows the check card. Check now always shows it.
 *
 * A name another account holds carries that account's record, so a check finds a record with
 * another token. Showing that on open scrolled past the record card, which is where the screen
 * says the name is held. So it waits for Check now, the same as a record that isn't there yet.
 * Proving control of a held name still shows: that answer is new.
 */
export const checkCardEarned = (
  claim: { status: ClaimStatus; heldByAnother: boolean },
  steps: Step[],
): boolean => {
  if (holdsTheName(claim.status)) {
    return true;
  }
  if (!checkFoundSomething(steps)) {
    return false;
  }
  return !(claim.heldByAnother && steps[3]?.state === 'wrong');
};
