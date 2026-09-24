// src/lib/domain/claimInput.ts
import { describeDomainInputError } from '@/lib/domain/messages';
import { normalizeDomainInput } from '@/lib/domain/normalize';

/**
 * What the claim input says about what has been typed so far. Runs on every keystroke, in the
 * browser, with the same normalization the server applies on submit.
 */
export type ClaimInputState =
  | { kind: 'idle' }
  /** `unicode` is what was typed when it was converted to punycode, so the message can say so. */
  | { kind: 'ok'; name: string; unicode: string | null }
  /** This account already has a claim on the name. */
  | { kind: 'exists'; name: string; id: string }
  | { kind: 'error'; title: string; action: string };

export type ClaimInputContext = {
  /** The account's claims, from the cached list. */
  claims: readonly { id: string; name: string }[];
  allowTestNamespace: boolean;
};

export const readClaimInput = (raw: string, context: ClaimInputContext): ClaimInputState => {
  if (raw.trim().length === 0) {
    return { kind: 'idle' };
  }

  const result = normalizeDomainInput(raw, { allowTestNamespace: context.allowTestNamespace });
  if (!result.ok) {
    const message = describeDomainInputError(result.error);
    return { kind: 'error', title: message.title, action: message.action };
  }

  const { name, changes } = result.value;
  const existing = context.claims.find((claim) => claim.name === name);
  if (existing !== undefined) {
    return { kind: 'exists', name, id: existing.id };
  }

  const converted = changes.find((change) => change.kind === 'converted_to_punycode');
  return { kind: 'ok', name, unicode: converted === undefined ? null : converted.from };
};
