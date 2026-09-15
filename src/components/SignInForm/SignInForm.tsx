// src/components/SignInForm/SignInForm.tsx
'use client';

import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RESEND_COOLDOWN_SECONDS } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';

type SignInFormProps = {
  /** Where to land after signing in. Already validated on the server that rendered this. */
  next: string | null;
};

type Phase = 'form' | 'sending' | 'sent' | 'unavailable';

/**
 * Client component because it holds the field, the phase and the cooldown.
 *
 * The cooldown is the honest half of the rate limit. The server refuses quietly, since a different
 * answer for a limited address would say which addresses are being targeted, so this is what tells
 * a real person waiting for an email that sending again immediately will not help.
 */
const SignInForm: React.FC<SignInFormProps> = ({ next }) => {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // The form is removed when the send succeeds, which would leave focus on nothing. Sending it to
  // the new heading keeps a keyboard or screen reader user where the page just moved them.
  useEffect(() => {
    if (phase === 'sent') {
      sentHeadingRef.current?.focus();
    }
  }, [phase]);

  const send = useCallback(async () => {
    setPhase('sending');
    setInvalid(false);
    try {
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), next }),
      });
      if (response.status === 400) {
        setInvalid(true);
        setPhase('form');
        inputRef.current?.focus();
        return;
      }
      if (!response.ok) {
        setPhase('unavailable');
        return;
      }
      setPhase('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setPhase('unavailable');
    }
  }, [email, next]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  const startOver = () => {
    setPhase('form');
    setCooldown(0);
    inputRef.current?.focus();
  };

  // The row goes horizontal at sm and the field is w-full, so without this the button is the only
  // thing that can give and it wraps onto two lines.
  const buttonClass =
    'shrink-0 whitespace-nowrap rounded-md bg-primary px-4 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-line-2';

  const noticeClass = 'flex flex-col gap-1 rounded-lg border p-4';

  return (
    <div className='flex flex-col gap-5'>
      {phase !== 'sent' && (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-2'>
          <label htmlFor={inputId} className='font-medium text-fg text-sm'>
            {signInCopy.form.label}
          </label>
          <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-row'>
            <input
              id={inputId}
              ref={inputRef}
              name='email'
              type='email'
              inputMode='email'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='you@example.com'
              aria-invalid={invalid}
              aria-describedby={statusId}
              // 16px below the sm breakpoint. iOS Safari zooms the viewport when a focused field is
              // smaller than that, which reads as the page overflowing sideways.
              className='w-full min-w-0 rounded-md border border-line-2 bg-surface px-3 py-2 text-base text-fg transition-colors placeholder:text-fg-4 hover:border-fg-4 focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-1 sm:text-sm aria-[invalid=true]:border-wrong-fg'
            />
            <button type='submit' disabled={phase === 'sending'} className={buttonClass}>
              {phase === 'sending' ? signInCopy.form.submitting : signInCopy.form.submit}
            </button>
          </div>
        </form>
      )}

      {/*
        One live region for every phase, in the document from first render. A region mounted at the
        same moment as its message is not reliably announced, so the container stays and only its
        contents change. It is never display:none either, since a hidden region leaves the
        accessibility tree and stops announcing.
      */}
      <div id={statusId} role='status' aria-live='polite'>
        {phase === 'sent' && (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <h2
                ref={sentHeadingRef}
                tabIndex={-1}
                className='font-medium text-lg tracking-tight outline-none'
              >
                {signInCopy.sent.title}
              </h2>
              <p className='text-fg-2 leading-relaxed'>
                {signInCopy.sent.description(email.trim())}
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                onClick={() => void send()}
                disabled={cooldown > 0}
                className={buttonClass}
              >
                {cooldown > 0 ? signInCopy.sent.resendIn(cooldown) : signInCopy.sent.resend}
              </button>
              <button
                type='button'
                onClick={startOver}
                className='rounded-md px-2 py-2 font-medium text-fg-2 text-sm underline underline-offset-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
              >
                {signInCopy.sent.changeAddress}
              </button>
            </div>
          </div>
        )}

        {invalid && (
          <div className={`${noticeClass} border-wrong-line bg-wrong-bg`}>
            <p className='font-medium text-fg text-sm'>{signInCopy.invalidEmail.title}</p>
            <p className='text-fg-2 text-sm leading-relaxed'>
              {signInCopy.invalidEmail.description}
            </p>
            <p className='text-fg-2 text-sm leading-relaxed'>{signInCopy.invalidEmail.action}</p>
          </div>
        )}

        {phase === 'unavailable' && (
          <div className={`${noticeClass} border-line bg-surface-2`}>
            <p className='font-medium text-fg text-sm'>{signInCopy.unavailable.title}</p>
            <p className='text-fg-2 text-sm leading-relaxed'>
              {signInCopy.unavailable.description}
            </p>
            <p className='text-fg-2 text-sm leading-relaxed'>{signInCopy.unavailable.action}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignInForm;
