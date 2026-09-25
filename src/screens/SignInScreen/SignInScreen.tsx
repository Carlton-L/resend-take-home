// src/screens/SignInScreen/SignInScreen.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Operator from '@/components/Operator/Operator';
import { RESEND_COOLDOWN_SECONDS } from '@/lib/auth/config';
import { signInCopy } from '@/lib/auth/messages';
import { safeNextPath } from '@/lib/auth/nextPath';
import { OAUTH_START_PATH } from '@/lib/auth/oauth';
import { BUTTON } from '@/screens/ClaimScreen/buttons';
import DemoFrame from '@/screens/SignInScreen/DemoFrame';

type Phase = 'form' | 'sending' | 'sent' | 'unavailable';

/** The same shape the server accepts. The server checks again; this only saves a round trip. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * GitHub's own mark, from github.com/logos, served as a file so the artwork stays theirs as
 * published. The white version, for a dark button.
 */
const GitHubIcon: React.FC = () => (
  // biome-ignore lint/performance/noImgElement: a 16px static mark needs no image pipeline
  <img src='/brand/github-mark-white.svg' alt='' width={16} height={16} className='size-4' />
);

const Line: React.FC<{ id: string; text: string | null }> = ({ id, text }) => (
  <p
    id={id}
    aria-live='polite'
    className='mt-[7px] flex min-h-5 items-start gap-[7px] text-[12.5px] text-warn leading-[1.45]'
  >
    {text !== null && (
      <>
        <span aria-hidden='true' className='mt-1.5 size-1.5 flex-none rounded-full bg-warn' />
        <span>{text}</span>
      </>
    )}
  </p>
);

/**
 * Sign in: GitHub, or a link by email. Beside it, a small copy of the app plays one claim from
 * start to verified, so a first-time visitor sees what they are signing in to.
 */
const SignInScreen: React.FC = () => {
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const copy = signInCopy;

  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [message, setMessage] = useState<string | null>(
    params.get('error') === null ? null : copy.oauthFailed,
  );
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // The form goes when the link is sent, which would leave focus on nothing.
  useEffect(() => {
    if (phase === 'sent') {
      titleRef.current?.focus();
    }
  }, [phase]);

  const send = useCallback(
    async (again: boolean) => {
      const address = email.trim();
      if (!looksLikeEmail(address)) {
        setMessage(copy.invalidEmail.message);
        inputRef.current?.focus();
        return;
      }
      setMessage(null);
      if (!again) {
        setPhase('sending');
      }
      try {
        const response = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: address, next }),
        });
        if (response.status === 400) {
          setPhase('form');
          setMessage(copy.invalidEmail.message);
          return;
        }
        if (!response.ok) {
          setPhase('unavailable');
          setMessage(`${copy.unavailable.title}. ${copy.unavailable.action}`);
          return;
        }
        setPhase('sent');
        setCooldown(RESEND_COOLDOWN_SECONDS);
        if (again) {
          setResent(true);
          setTimeout(() => setResent(false), 1600);
        }
      } catch {
        setPhase('unavailable');
        setMessage(`${copy.unavailable.title}. ${copy.unavailable.action}`);
      }
    },
    [email, next],
  );

  if (phase === 'sent') {
    return (
      <div className='page-wrap flex flex-1 items-center py-12'>
        <Operator
          label={copy.sent.label}
          badge={copy.sent.badge}
          badgeTone='wait'
          className='w-[min(460px,100%)]'
        >
          <div className='px-[26px] pt-[26px] pb-[22px] max-[720px]:px-5'>
            <h1
              ref={titleRef}
              tabIndex={-1}
              className='mb-2 font-semibold text-2xl tracking-[-0.02em] outline-none'
            >
              {copy.sent.title}
            </h1>
            <p role='status' className='mb-[22px] text-fg-3'>
              {copy.sent.description(email.trim())}
            </p>
            <button
              type='button'
              onClick={() => void send(true)}
              disabled={cooldown > 0}
              className={`${BUTTON.regular} min-w-28`}
            >
              {resent
                ? copy.sent.resent
                : cooldown > 0
                  ? copy.sent.resendIn(cooldown)
                  : copy.sent.resend}
            </button>
            <div className='mt-[18px] text-[12.5px]'>
              <button
                type='button'
                onClick={() => {
                  setPhase('form');
                  setCooldown(0);
                }}
                className='text-fg-3 underline underline-offset-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2'
              >
                {copy.sent.changeAddress}
              </button>
            </div>
          </div>
        </Operator>
      </div>
    );
  }

  const github = `${OAUTH_START_PATH('github')}${next === null ? '' : `?next=${encodeURIComponent(next)}`}`;

  return (
    <div className='page-wrap grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-16 py-12 max-[900px]:flex max-[900px]:max-w-[520px] max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-0 max-[720px]:py-8'>
      <div className='max-w-[380px] max-[900px]:contents'>
        <p className='mb-7 font-medium font-mono text-[10.5px] text-fg-5 uppercase tracking-[0.12em] max-[900px]:order-1'>
          {copy.form.brand}
        </p>
        <h1 className='mb-3 text-balance font-semibold text-[34px] leading-[1.1] tracking-[-0.025em] max-[900px]:order-2'>
          {copy.form.headline}
        </h1>
        <p className='mb-[30px] max-w-[340px] text-[15px] text-fg-3 max-[900px]:order-3 max-[900px]:mb-[22px]'>
          {copy.form.sub}
        </p>
        <div className='flex flex-col gap-2.5 max-[900px]:order-5'>
          <a
            href={github}
            className={`${BUTTON.regular} h-[42px] justify-start px-4 text-[13.5px]`}
          >
            <GitHubIcon />
            {copy.form.github}
          </a>
        </div>
        <div
          aria-hidden='true'
          className='my-[22px] mb-4 flex items-center gap-3 font-medium font-mono text-[10.5px] text-fg-5 uppercase tracking-[0.12em] before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line max-[900px]:order-6'
        >
          {copy.form.or}
        </div>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void send(false);
          }}
          className='max-[900px]:order-7'
        >
          <label htmlFor='signin-email' className='mb-1.5 block text-[12.5px] text-fg-3'>
            {copy.form.label}
          </label>
          <div className='flex gap-2'>
            <input
              id='signin-email'
              ref={inputRef}
              type='email'
              inputMode='email'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage(null);
              }}
              placeholder={copy.form.placeholder}
              aria-invalid={message === copy.invalidEmail.message}
              aria-describedby='signin-email-message'
              // 16px on phones. iOS zooms the page into a focused field smaller than that.
              className='h-10 w-full min-w-0 rounded-[7px] border border-line-control bg-bg px-3 text-fg text-sm transition-[border-color,box-shadow] placeholder:text-fg-5 focus:border-[#3b3b41] focus:shadow-[0_0_0_3px_rgba(86,180,233,0.12)] focus:outline-none max-[720px]:text-base'
            />
            <button
              type='submit'
              disabled={phase === 'sending'}
              className={`${BUTTON.regular} h-10 flex-none`}
            >
              {phase === 'sending' ? copy.form.submitting : copy.form.submit}
            </button>
          </div>
          <Line id='signin-email-message' text={message} />
        </form>
      </div>
      <DemoFrame className='max-[900px]:order-4 max-[900px]:mb-[26px]' />
    </div>
  );
};

export default SignInScreen;
