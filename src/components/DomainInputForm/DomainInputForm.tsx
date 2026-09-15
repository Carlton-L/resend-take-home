// src/components/DomainInputForm/DomainInputForm.tsx
'use client';

import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import DomainError from '@/components/DomainError/DomainError';
import DomainResult from '@/components/DomainResult/DomainResult';
import DomainResultEmpty from '@/components/DomainResultEmpty/DomainResultEmpty';
import type { DomainInputResult } from '@/lib/domain/normalize';
import { normalizeDomainInput } from '@/lib/domain/normalize';

/**
 * Long enough that a name is not read back a letter at a time, short enough that a person who has
 * stopped typing does not wonder whether anything is going to happen.
 */
const SETTLE_MS = 400;

/**
 * A dot with something after it. `normalizeDomainInput` is happy to judge `exa`, and judging it
 * tells someone mid-word that what they are typing is wrong, which it is not yet.
 */
const LOOKS_LIKE_A_NAME = /\.[^.\s]/;

type DomainInputFormProps = {
  /**
   * Whether `.test` names are let through. Decided by the deployment and read on the server, so
   * this component stays free of anything platform specific and the same value reaches the claim
   * endpoint, which is the one that decides.
   */
  allowTestNamespace: boolean;
};

/**
 * Client component because it holds the field value and the result. Its children are pulled into
 * the client bundle with it, so none of them needs the directive of its own.
 *
 * `normalizeDomainInput` is pure and imports nothing platform specific, so it runs here for an
 * answer with no round trip. The claim endpoint runs the same function as the authority. One
 * function, so the two cannot drift.
 *
 * There is no Check button. The answer costs nothing, so the product works it out rather than
 * asking to be told when to, which is the same argument the record screen makes about its own
 * check. What remains deliberate is the claim itself: the name is read back and the button that
 * takes it carries that name.
 *
 * Two things stop that from correcting someone mid-word. The answer waits for a pause, and it waits
 * for the value to look like a name at all. Leaving the field asks immediately, because someone who
 * has moved on has finished typing whatever they were going to type.
 */
const DomainInputForm: React.FC<DomainInputFormProps> = ({ allowTestNamespace }) => {
  const inputId = useId();
  const resultId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<DomainInputResult | null>(null);

  const check = (raw: string) => setResult(normalizeDomainInput(raw, { allowTestNamespace }));

  // Reads the value rather than being called from the change handler, so a pause is measured from
  // the last keystroke rather than from the first.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setResult(null);
      return;
    }
    if (!LOOKS_LIKE_A_NAME.test(trimmed)) {
      return;
    }
    const timer = setTimeout(() => {
      setResult(normalizeDomainInput(trimmed, { allowTestNamespace }));
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [value, allowTestNamespace]);

  // Someone who has left the field has finished, whether or not what they left behind looks like a
  // name. This is the path that answers for `localhost` and for a single label.
  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      check(trimmed);
    }
  };

  // Enter still asks, without waiting out the pause. The form has no submit button, and a form with
  // one text field submits on Enter without one.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    check(value.trim());
  };

  // Applying a suggestion checks it straight away, so the user sees the result of the name they
  // just accepted. Focus returns to the field, since that is where they would edit next.
  const handleUseSuggestion = (name: string) => {
    setValue(name);
    check(name);
    inputRef.current?.focus();
  };

  const hasError = result !== null && !result.ok;

  return (
    <div className='flex flex-col gap-5'>
      {/* noValidate because the browser's own messages cannot say any of what ours say. */}
      <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-2'>
        <label htmlFor={inputId} className='font-medium text-fg text-sm'>
          Domain
        </label>
        <div className='flex w-full min-w-0 flex-col gap-2'>
          <input
            id={inputId}
            ref={inputRef}
            name='domain'
            // Text rather than url: type='url' makes the browser demand a scheme, and a bare
            // domain is exactly what we want. The keyboard hint comes from inputMode instead.
            type='text'
            inputMode='url'
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={handleBlur}
            placeholder='example.com'
            // iOS capitalizes the first letter of a text field by default, which would make every
            // phone user type Example.com.
            autoCapitalize='none'
            autoCorrect='off'
            autoComplete='off'
            spellCheck={false}
            aria-invalid={hasError}
            aria-describedby={result === null ? undefined : resultId}
            className='w-full min-w-0 rounded-md border border-line-2 bg-surface px-3 py-2 font-mono text-fg text-base sm:text-sm transition-colors placeholder:text-fg-4 hover:border-fg-4 focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 aria-[invalid=true]:border-wrong-fg'
          />
        </div>
      </form>

      {/*
        The live region is in the document from first render. A region inserted at the same moment
        as its content is not reliably announced, so the container is always here and only its
        contents change. It is never display:none either, since a hidden region leaves the
        accessibility tree and stops announcing.
      */}
      <div id={resultId} role='status' aria-live='polite'>
        {result === null ? (
          <DomainResultEmpty />
        ) : result.ok ? (
          <DomainResult value={result.value} onUseSuggestion={handleUseSuggestion} />
        ) : (
          <DomainError error={result.error} onUseSuggestion={handleUseSuggestion} />
        )}
      </div>
    </div>
  );
};

export default DomainInputForm;
