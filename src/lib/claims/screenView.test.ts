// src/lib/claims/screenView.test.ts
import { describe, expect, it } from 'vitest';
import { type CardsInput, cardsFor, checkCardEarned, recordKnown } from '@/lib/claims/screenView';
import type { StepKey } from '@/lib/claims/steps';

const steps = (...states: string[]) =>
  (['zone', 'nameservers', 'record', 'token', 'claim'] as const).map((key, index) => ({
    key,
    state: states[index] ?? 'idle',
  }));

const input = (over: Partial<CardsInput>): CardsInput => ({
  status: 'pending',
  steps: steps('queued', 'queued', 'queued', 'queued', 'queued'),
  running: null,
  recordShown: false,
  checkShown: false,
  ...over,
});

describe('cardsFor', () => {
  it('shows only the nameservers card on a new claim', () => {
    expect(cardsFor(input({}))).toEqual({ visible: [true, false, false, false], current: 0 });
  });

  it('moves to the record card once the nameservers are known', () => {
    const cards = cardsFor(input({ recordShown: true, steps: steps('done', 'done', 'wait') }));
    expect(cards).toEqual({ visible: [true, true, false, false], current: 1 });
  });

  it('stays on the nameservers card when the zone is not found', () => {
    const cards = cardsFor(input({ recordShown: true, steps: steps('wrong') }));
    expect(cards.current).toBe(0);
  });

  it('moves to the check card while Check now runs', () => {
    const cards = cardsFor(input({ recordShown: true, checkShown: true, running: 'live' }));
    expect(cards).toEqual({ visible: [true, true, true, false], current: 2 });
  });

  it('goes back to the record card when the check is still waiting on it', () => {
    const cards = cardsFor(
      input({ recordShown: true, checkShown: true, steps: steps('done', 'done', 'wait') }),
    );
    expect(cards.current).toBe(1);
  });

  it('stays on the check card when it found a wrong value', () => {
    const cards = cardsFor(
      input({ recordShown: true, checkShown: true, steps: steps('done', 'done', 'done', 'wrong') }),
    );
    expect(cards.current).toBe(2);
  });

  it('ends on the verified card', () => {
    const cards = cardsFor(
      input({
        status: 'verified',
        recordShown: true,
        checkShown: true,
        steps: steps('done', 'done', 'done', 'done', 'done'),
      }),
    );
    expect(cards).toEqual({ visible: [true, true, true, true], current: 3 });
  });

  it('goes back up to the record card when a verified claim is at risk', () => {
    const cards = cardsFor(
      input({
        status: 'at_risk',
        recordShown: true,
        checkShown: true,
        steps: steps('done', 'done', 'wrong'),
      }),
    );
    expect(cards).toEqual({ visible: [true, true, true, true], current: 1 });
  });
});

describe('recordKnown', () => {
  it('is true when a check stored the DNS host, or the claim holds its name', () => {
    expect(recordKnown({ status: 'pending', dnsHost: 'Cloudflare' })).toBe(true);
    expect(recordKnown({ status: 'verified', dnsHost: null })).toBe(true);
    expect(recordKnown({ status: 'pending', dnsHost: null })).toBe(false);
  });
});

describe('checkCardEarned', () => {
  const steps = (record: string, token: string) =>
    [
      { key: 'zone', state: 'done' },
      { key: 'nameservers', state: 'done' },
      { key: 'record', state: record },
      { key: 'token', state: token },
      { key: 'claim', state: 'idle' },
    ] as { key: StepKey; state: string }[];

  it('shows a wrong token on a name nobody else holds', () => {
    expect(
      checkCardEarned({ status: 'pending', heldByAnother: false }, steps('done', 'wrong')),
    ).toBe(true);
  });

  // The other account's record is at the name, so a wrong token is expected and the record card
  // is where the screen explains it.
  it('waits for Check now on a name another account holds', () => {
    expect(
      checkCardEarned({ status: 'pending', heldByAnother: true }, steps('done', 'wrong')),
    ).toBe(false);
  });

  it('shows control proved on a name another account holds', () => {
    expect(checkCardEarned({ status: 'pending', heldByAnother: true }, steps('done', 'done'))).toBe(
      true,
    );
  });

  it('waits while the record is not there yet', () => {
    expect(
      checkCardEarned({ status: 'pending', heldByAnother: false }, steps('wait', 'idle')),
    ).toBe(false);
  });

  it('always shows on a claim that holds its name', () => {
    expect(
      checkCardEarned({ status: 'verified', heldByAnother: false }, steps('wait', 'idle')),
    ).toBe(true);
  });
});
