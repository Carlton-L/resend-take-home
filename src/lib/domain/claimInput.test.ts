// src/lib/domain/claimInput.test.ts
import { describe, expect, it } from 'vitest';
import { readClaimInput } from '@/lib/domain/claimInput';

const context = { claims: [{ id: 'a1', name: 'carlton.dev' }], allowTestNamespace: false };

describe('readClaimInput', () => {
  it('says nothing about an empty field', () => {
    expect(readClaimInput('', context)).toEqual({ kind: 'idle' });
    expect(readClaimInput('   ', context)).toEqual({ kind: 'idle' });
  });

  it('reads a plain domain', () => {
    expect(readClaimInput('acme.dev', context)).toEqual({
      kind: 'ok',
      name: 'acme.dev',
      unicode: null,
    });
  });

  it('reads the domain out of a pasted URL', () => {
    expect(readClaimInput('https://acme.dev/pricing', context)).toMatchObject({
      kind: 'ok',
      name: 'acme.dev',
    });
  });

  it('names the Unicode it converted to punycode', () => {
    expect(readClaimInput('münchen.de', context)).toEqual({
      kind: 'ok',
      name: 'xn--mnchen-3ya.de',
      unicode: 'münchen.de',
    });
  });

  it('points at the claim this account already has', () => {
    expect(readClaimInput('https://Carlton.dev', context)).toEqual({
      kind: 'exists',
      name: 'carlton.dev',
      id: 'a1',
    });
  });

  it('refuses an IP address with the input messages', () => {
    const state = readClaimInput('192.168.0.1', context);
    expect(state.kind).toBe('error');
    expect(state.kind === 'error' && state.title).toBe('That is an IP address');
  });

  it('refuses a public suffix', () => {
    expect(readClaimInput('co.uk', context).kind).toBe('error');
  });

  it('accepts .test names only where the demo namespace is on', () => {
    expect(readClaimInput('verified.test', context).kind).toBe('error');
    expect(readClaimInput('verified.test', { ...context, allowTestNamespace: true }).kind).toBe(
      'ok',
    );
  });
});
