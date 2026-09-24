// src/client/check/checkReducer.ts
import type { FailureMessage } from '@/lib/claims/messages';
import { type CheckStep, STEP_KEYS, type StepKey } from '@/lib/claims/steps';
import type { CheckView } from '@/lib/claims/view';
import { claimScreenCopy } from '@/lib/copy/claim';

/** A step as the screen shows it: the check's own states, plus running and not yet asked. */
export type ShownState = CheckStep['state'] | 'run' | 'queued';

export type ShownStep = {
  key: StepKey;
  state: ShownState;
  answer: string;
  fix: FailureMessage | null;
  /** This step's state is different from what the screen showed before this check. */
  changed: boolean;
};

/**
 * `live`: Check now, or a claim's first check. Each step is revealed in turn.
 * `background`: a scheduled check. The screen keeps what it shows and only changed steps move.
 */
export type CheckMode = 'live' | 'background';

export type CheckError = 'limited' | 'unavailable' | 'offline' | 'not_found';

export type CheckState = {
  steps: ShownStep[];
  running: CheckMode | null;
  /** The last finished answer this visit. */
  view: CheckView | null;
  error: CheckError | null;
  /** Answers this visit, for the schedule. */
  answers: number;
};

export type CheckAction =
  | { type: 'start'; mode: CheckMode }
  /** A live reveal marks the step running before it lands. */
  | { type: 'run'; index: number }
  | { type: 'land'; index: number; step: CheckStep }
  | { type: 'done'; view: CheckView }
  | { type: 'fail'; error: CheckError };

const queued = (key: StepKey): ShownStep => ({
  key,
  state: 'queued',
  answer: claimScreenCopy.queued,
  fix: null,
  changed: false,
});

export const initialCheckState: CheckState = {
  steps: STEP_KEYS.map(queued),
  running: null,
  view: null,
  error: null,
  answers: 0,
};

export const checkReducer = (state: CheckState, action: CheckAction): CheckState => {
  switch (action.type) {
    case 'start': {
      if (action.mode === 'background') {
        return { ...state, running: 'background', error: null };
      }
      // A live check starts the row again. Steps 01 and 02 stay if they passed, since the zone
      // and its nameservers rarely change between two checks a few seconds apart.
      const steps = state.steps.map((step, index) =>
        index < 2 && step.state === 'done' ? { ...step, changed: false } : queued(step.key),
      );
      return { ...state, steps, running: 'live', error: null };
    }
    case 'run': {
      const steps = state.steps.map((step, index) =>
        index === action.index
          ? { ...step, state: 'run' as const, answer: claimScreenCopy.running[step.key] }
          : step,
      );
      return { ...state, steps };
    }
    case 'land': {
      const before = state.view?.steps[action.index]?.state ?? null;
      const steps = state.steps.map((step, index) =>
        index === action.index ? { ...action.step, changed: before !== action.step.state } : step,
      );
      return { ...state, steps };
    }
    case 'done': {
      // The final answer is the truth. Steps that never landed, because the check stopped before
      // them, take the final answer's words.
      const steps = action.view.steps.map((step, index) => ({
        ...step,
        changed: state.steps[index]?.changed ?? false,
      }));
      return { ...state, steps, view: action.view, running: null, answers: state.answers + 1 };
    }
    case 'fail':
      return {
        ...state,
        running: null,
        error: action.error,
        // A check that failed part way leaves nothing running on screen.
        steps: state.steps.map((step, index) =>
          step.state === 'run'
            ? state.view?.steps[index]
              ? { ...state.view.steps[index], changed: false }
              : queued(step.key)
            : step,
        ),
      };
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
};

/** Whether any step in this range has landed as something other than a pass. */
export const stoppedIn = (steps: ShownStep[], from: number, to: number): ShownStep | null =>
  steps.slice(from, to).find((step) => step.state === 'wait' || step.state === 'wrong') ?? null;

/**
 * The step a background check is probing: the first one in the range that hasn't passed. Null
 * when every step in the range has passed.
 */
export const probeIndex = (steps: ShownStep[], from: number, to: number): number | null => {
  for (let index = from; index < to; index += 1) {
    if (steps[index]?.state !== 'done') {
      return index;
    }
  }
  return null;
};
