// src/client/check/checkReducer.test.ts
import { describe, expect, it } from 'vitest';
import {
  type CheckState,
  checkReducer,
  initialCheckState,
  probeIndex,
  stoppedIn,
} from '@/client/check/checkReducer';
import type { CheckStep } from '@/lib/claims/steps';
import type { CheckView } from '@/lib/claims/view';

const step = (key: CheckStep['key'], state: CheckStep['state'], answer = key): CheckStep => ({
  key,
  state,
  answer,
  fix: null,
});

const WAITING: CheckStep[] = [
  step('zone', 'done'),
  step('nameservers', 'done'),
  step('record', 'wait'),
  step('token', 'idle'),
  step('claim', 'idle'),
];

const VERIFIED: CheckStep[] = [
  step('zone', 'done'),
  step('nameservers', 'done'),
  step('record', 'done'),
  step('token', 'done'),
  step('claim', 'done'),
];

const view = (steps: CheckStep[]): CheckView => ({
  steps,
  needsAttention: false,
  answered: steps.filter((s) => s.state !== 'idle').length,
  status: { label: 'Pending', line: '', tone: 'neutral', extra: null },
  provider: null,
  settled: false,
});

/** Runs a whole check: start, every step landing, then done. */
const runCheck = (state: CheckState, mode: 'live' | 'background', steps: CheckStep[]) => {
  let next = checkReducer(state, { type: 'start', mode });
  steps.forEach((s, index) => {
    if (mode === 'live') {
      next = checkReducer(next, { type: 'run', index });
    }
    next = checkReducer(next, { type: 'land', index, step: s });
  });
  return checkReducer(next, { type: 'done', view: view(steps) });
};

describe('checkReducer', () => {
  it('starts with every step queued and nothing running', () => {
    expect(initialCheckState.steps.map((s) => s.state)).toEqual(Array(5).fill('queued'));
    expect(initialCheckState.running).toBeNull();
  });

  it('marks a step running during a live reveal, with what it is doing', () => {
    let state = checkReducer(initialCheckState, { type: 'start', mode: 'live' });
    state = checkReducer(state, { type: 'run', index: 0 });
    expect(state.steps[0]).toMatchObject({ state: 'run', answer: 'Looking up the zone' });
    expect(state.running).toBe('live');
  });

  it('ends on the final answer and counts it', () => {
    const state = runCheck(initialCheckState, 'live', WAITING);
    expect(state.steps.map((s) => s.state)).toEqual(['done', 'done', 'wait', 'idle', 'idle']);
    expect(state.running).toBeNull();
    expect(state.answers).toBe(1);
  });

  it('marks every step changed on the first check of a visit', () => {
    const state = runCheck(initialCheckState, 'background', WAITING);
    expect(state.steps.every((s) => s.changed)).toBe(true);
  });

  it('marks only the steps that changed on a later background check', () => {
    const first = runCheck(initialCheckState, 'background', WAITING);
    const second = runCheck(first, 'background', VERIFIED);
    expect(second.steps.map((s) => s.changed)).toEqual([false, false, true, true, true]);
  });

  it('keeps what the screen shows while a background check runs', () => {
    const first = runCheck(initialCheckState, 'background', WAITING);
    const running = checkReducer(first, { type: 'start', mode: 'background' });
    expect(running.steps.map((s) => s.state)).toEqual(['done', 'done', 'wait', 'idle', 'idle']);
    expect(running.running).toBe('background');
  });

  it('keeps passed nameserver steps when a live check starts again', () => {
    const first = runCheck(initialCheckState, 'live', WAITING);
    const again = checkReducer(first, { type: 'start', mode: 'live' });
    expect(again.steps.map((s) => s.state)).toEqual(['done', 'done', 'queued', 'queued', 'queued']);
  });

  it('leaves nothing running when a check fails part way', () => {
    const first = runCheck(initialCheckState, 'live', WAITING);
    let state = checkReducer(first, { type: 'start', mode: 'live' });
    state = checkReducer(state, { type: 'run', index: 2 });
    state = checkReducer(state, { type: 'fail', error: 'offline' });
    expect(state.steps[2]?.state).toBe('wait');
    expect(state.error).toBe('offline');
    expect(state.running).toBeNull();
  });
});

describe('stoppedIn and probeIndex', () => {
  const state = runCheck(initialCheckState, 'live', WAITING);

  it('finds the step that stopped the check in a card', () => {
    expect(stoppedIn(state.steps, 2, 5)?.key).toBe('record');
    expect(stoppedIn(state.steps, 0, 2)).toBeNull();
  });

  it('probes the first step in a row that has not passed', () => {
    expect(probeIndex(state.steps, 2, 5)).toBe(2);
    expect(probeIndex(state.steps, 0, 2)).toBeNull();
  });
});
