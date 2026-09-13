// src/components/DomainInputForm/DomainInputForm.tsx
'use client';

import type React from 'react';
import { useId, useRef, useState } from 'react';
import DomainError from '@/components/DomainError/DomainError';
import DomainResult from '@/components/DomainResult/DomainResult';
import type { DomainInputResult } from '@/lib/domain/normalize';
import { normalizeDomainInput } from '@/lib/domain/normalize';

/**
 * Client component because it holds the field value and the result. Its children are pulled into
 * the client bundle with it, so none of them needs the directive of its own.
 *
 * `normalizeDomainInput` is pure and imports nothing platform specific, so it runs here for an
 * answer with no round trip. When the claim endpoint lands, the server runs the same function as
 * the authority. One function, so the two cannot drift.
 */
const DomainInputForm: React.FC = () => {
  const inputId = useId();
  const resultId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<DomainInputResult | null>(null);

  const check = (raw: string) => setResult(normalizeDomainInput(raw));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    check(value);
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
        <label htmlFor={inputId} className='font-medium text-neutral-900 text-sm'>
          Domain
        </label>
        <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-row'>
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
            placeholder='example.com'
            // iOS capitalizes the first letter of a text field by default, which would make every
            // phone user type Example.com.
            autoCapitalize='none'
            autoCorrect='off'
            autoComplete='off'
            spellCheck={false}
            aria-invalid={hasError}
            aria-describedby={result === null ? undefined : resultId}
            className='w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-neutral-900 text-base sm:text-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-400 focus-visible:border-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-1 aria-[invalid=true]:border-red-400'
          />
          <button
            type='submit'
            className='rounded-md bg-neutral-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-neutral-900 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300'
          >
            Check
          </button>
        </div>
      </form>

      {/*
        The live region is in the document from first render. A region inserted at the same moment
        as its content is not reliably announced, so the container is always here and only its
        contents change. It is never display:none either, since a hidden region leaves the
        accessibility tree and stops announcing.
      */}
      <div id={resultId} role='status' aria-live='polite'>
        {result !== null &&
          (result.ok ? (
            <DomainResult value={result.value} onUseSuggestion={handleUseSuggestion} />
          ) : (
            <DomainError error={result.error} onUseSuggestion={handleUseSuggestion} />
          ))}
      </div>
    </div>
  );
};

export default DomainInputForm;
