// src/components/DomainResult/DomainResult.tsx
import type React from 'react';
import { useState } from 'react';
import { claimCopy } from '@/lib/claims/messages';
import { describeChange } from '@/lib/domain/messages';
import type { NormalizedDomain } from '@/lib/domain/normalize';

type DomainResultProps = {
  value: NormalizedDomain;
  /** Fills the field with a related name. Used for the www suggestion. */
  onUseSuggestion: (name: string) => void;
};

/**
 * The name we would claim, and every change made to get there, with the control that claims it.
 *
 * This card is the confirmation step. The user typed something, the name that would be taken is read
 * back to them, and the button carries that name, so creating on submit is not needed. A typo that
 * passes validation would otherwise take a name with no one having seen it. The card now appears
 * without being asked for, which changes nothing about that: the deliberate act was never pressing
 * Check, it was pressing the button with the name on it.
 *
 * A plain form post rather than a fetch, so claiming works with no client JavaScript.
 *
 * The button disables itself on submit. This is a real browser navigation to a route handler that
 * redirects, so the page it came from stays on screen while that happens and a second press is
 * easy to make. `useFormStatus` does not help here: React only reports pending for a submission it
 * is driving, and this one belongs to the browser.
 *
 * The name is always the ASCII form, including for an internationalized domain, because that is the
 * string the user types into their DNS panel on the next screen. The readable form appears only as
 * the echo of what they typed, which is a quote rather than a claim about which domain this is.
 */
const DomainResult: React.FC<DomainResultProps> = ({ value, onUseSuggestion }) => {
  const [claiming, setClaiming] = useState(false);
  const changed = value.changes.length > 0;

  // www is the one subdomain conventionally treated as an alias for the name above it, so it is
  // the one case where the user probably meant something else. Offered, never applied. A silent
  // rewrite is the thing this screen exists to argue against.
  // Gated on isApex, not on label count: for www.co.uk the registrable domain is the whole
  // name, and dropping the www would suggest a public suffix we refuse.
  const labels = value.name.split('.');
  const withoutWww = !value.isApex && labels[0] === 'www' ? labels.slice(1).join('.') : null;

  return (
    <div className='flex flex-col gap-5 rounded-md border border-neutral-200 bg-white p-5'>
      <div className='flex flex-col gap-1'>
        {changed && (
          <span className='break-all font-mono text-neutral-500 text-sm'>{value.input}</span>
        )}
        <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
          Name to claim
        </span>
        <span className='break-all font-medium font-mono text-lg text-neutral-900'>
          {value.name}
        </span>
        {!value.isApex && (
          <span className='text-neutral-600 text-sm'>
            Subdomain of <span className='font-mono'>{value.registrableDomain}</span>. Claimed
            separately from it.
          </span>
        )}
      </div>

      {withoutWww !== null && (
        <div className='flex flex-col items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-4'>
          <p className='text-neutral-700 text-sm leading-relaxed'>
            <span className='font-mono'>{value.name}</span> and{' '}
            <span className='font-mono'>{withoutWww}</span> are different names, and this claim does
            not cover the other one. Most people claiming www want the name without it.
          </p>
          <button
            type='button'
            onClick={() => onUseSuggestion(withoutWww)}
            className='rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium font-mono text-neutral-900 text-sm transition-colors hover:border-neutral-400 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
          >
            Use {withoutWww}
          </button>
        </div>
      )}

      <form
        method='post'
        action='/api/claims'
        onSubmit={() => setClaiming(true)}
        className='flex flex-col'
      >
        <input type='hidden' name='name' value={value.name} />
        <button
          type='submit'
          disabled={claiming}
          aria-busy={claiming}
          className='self-start break-all rounded-md bg-neutral-900 px-4 py-2 text-left font-medium font-mono text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2 disabled:cursor-wait disabled:bg-neutral-400'
        >
          {claiming ? claimCopy.create.submitting : claimCopy.create.submit(value.name)}
        </button>
      </form>

      {changed && (
        <div className='flex flex-col gap-3 border-neutral-200 border-t pt-4'>
          <span className='font-medium text-neutral-500 text-xs uppercase tracking-wider'>
            What changed
          </span>
          <ul className='flex flex-col gap-2'>
            {value.changes.map((change) => {
              const described = describeChange(change);
              return (
                // Each kind is recorded at most once, so the kind is a stable key.
                <li key={change.kind} className='flex flex-col gap-1 text-sm'>
                  <span className='text-neutral-700'>
                    {described.summary}
                    {described.value !== null && (
                      <span className='break-all font-mono text-neutral-900'>
                        {' '}
                        {described.value}
                      </span>
                    )}
                  </span>
                  {described.detail !== null && (
                    <span className='text-neutral-500 text-xs leading-relaxed'>
                      {described.detail}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DomainResult;
