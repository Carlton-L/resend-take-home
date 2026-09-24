// src/screens/DomainsScreen/ClaimInput.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { CLAIMS_KEY, createClaim } from '@/client/api';
import { useClaims, useMe } from '@/client/queries';
import { shell, useShell } from '@/client/shellStore';
import Operator from '@/components/Operator/Operator';
import { SIGN_IN_PATH } from '@/lib/auth/config';
import { claimPath, DOMAINS_PATH } from '@/lib/claims/config';
import { claimCopy } from '@/lib/claims/messages';
import { domainsCopy } from '@/lib/copy/domains';
import { type ClaimInputState, readClaimInput } from '@/lib/domain/claimInput';

/** The line under the input. `refused` is what the server said after a submit. */
type Message = { kind: 'state'; state: ClaimInputState } | { kind: 'refused'; text: string };

/** How long the new row plays in the list before the screen moves to the claim. */
const ROW_BEAT_MS = 520;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Line: React.FC<{ message: Message; submitted: boolean }> = ({ message, submitted }) => {
  const copy = domainsCopy.input;
  let tone: 'dim' | 'ok' | 'err' = 'dim';
  let body: React.ReactNode = copy.hint;

  if (message.kind === 'refused') {
    tone = 'err';
    body = message.text;
  } else {
    const { state } = message;
    if (state.kind === 'idle') {
      tone = submitted ? 'err' : 'dim';
      body = submitted ? copy.empty : copy.hint;
    } else if (state.kind === 'error') {
      tone = 'err';
      body = `${state.title}. ${state.action}`;
    } else if (state.kind === 'exists') {
      body = (
        <>
          {copy.exists}{' '}
          <Link
            href={claimPath(state.id)}
            className='text-signal underline decoration-signal/35 underline-offset-[3px] hover:decoration-signal'
          >
            {copy.openIt}
          </Link>
        </>
      );
    } else {
      tone = 'ok';
      body = (
        <>
          {copy.willUse} <code className='font-mono text-fg text-xs'>{state.name}</code>
          {state.unicode === null ? '' : ` ${copy.asciiOf(state.unicode)}`}
        </>
      );
    }
  }

  const dot = tone === 'ok' ? 'bg-signal' : tone === 'err' ? 'bg-warn' : 'bg-fg-5';
  return (
    <p
      id='claim-input-message'
      aria-live='polite'
      className={`mt-[7px] flex min-h-5 items-start gap-[7px] text-[12.5px] leading-[1.45] ${tone === 'err' ? 'text-warn' : 'text-fg-3'}`}
    >
      <span aria-hidden='true' className={`mt-1.5 size-1.5 flex-none rounded-full ${dot}`} />
      <span>{body}</span>
    </p>
  );
};

/**
 * Checks what you type as you type it, with the same rules the server applies. A name you already
 * claimed says so and links to it. Submitting adds the row to the list, then opens the claim.
 */
const ClaimInput: React.FC = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: claims } = useClaims();
  const { data: me } = useMe();
  const { focusClaim } = useShell();

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<Message>({ kind: 'state', state: { kind: 'idle' } });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [shine, setShine] = useState(false);

  const read = (raw: string) =>
    readClaimInput(raw, {
      claims: claims ?? [],
      allowTestNamespace: me?.testNamespace ?? false,
    });

  // Claim a domain in the sidebar or picker lands here: focus the field and light the card once.
  useEffect(() => {
    if (!focusClaim) {
      return;
    }
    const timer = setTimeout(
      () => {
        shell.claimInputFocused();
        inputRef.current?.focus({ preventScroll: true });
        setShine(true);
      },
      reducedMotion() ? 0 : 200,
    );
    return () => clearTimeout(timer);
  }, [focusClaim]);

  // Two identical animations, alternated, so a second refusal restarts the shake.
  const refuse = () => {
    setShake((n) => n + 1);
    inputRef.current?.focus();
  };

  const onChange = (raw: string) => {
    setValue(raw);
    setSubmitted(false);
    setMessage({ kind: 'state', state: read(raw) });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    const state = read(value);
    setMessage({ kind: 'state', state });
    setSubmitted(true);

    if (state.kind === 'idle' || state.kind === 'error') {
      refuse();
      return;
    }
    if (state.kind === 'exists') {
      router.push(claimPath(state.id));
      return;
    }

    setBusy(true);
    const created = await createClaim(value);
    if (!created.ok) {
      setBusy(false);
      if (created.error === 'signed_out') {
        window.location.assign(`${SIGN_IN_PATH}?next=${encodeURIComponent(DOMAINS_PATH)}`);
        return;
      }
      const copy =
        created.error === 'limited'
          ? claimCopy.create.tooMany
          : created.error === 'invalid'
            ? claimCopy.create.invalid
            : claimCopy.create.unavailable;
      setMessage({ kind: 'refused', text: `${copy.title}. ${copy.action}` });
      refuse();
      return;
    }

    // The new row plays in the list and the sidebar, then the screen moves to the claim.
    shell.added(created.id);
    await mutate(CLAIMS_KEY);
    setValue('');
    setSubmitted(false);
    setMessage({ kind: 'state', state: { kind: 'idle' } });
    const flag =
      created.outcome === 'existing' ? (created.reissued ? '?reissued=1' : '?existing=1') : '';
    setTimeout(
      () => {
        setBusy(false);
        router.push(`${claimPath(created.id)}${flag}`);
      },
      reducedMotion() ? 0 : ROW_BEAT_MS,
    );
  };

  const copy = domainsCopy.input;
  return (
    <Operator
      label={copy.card}
      badge={copy.badge}
      className={`mb-[18px] ${shine ? 'shine' : ''}`}
      onAnimationEnd={(event) => {
        if (event.animationName === 'shine') {
          setShine(false);
        }
      }}
    >
      <div className='px-[18px] pt-4 pb-3 max-[720px]:px-3.5'>
        <form onSubmit={onSubmit} autoComplete='off' className='flex gap-2'>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.label}
            aria-describedby='claim-input-message'
            aria-invalid={
              message.kind === 'refused' ||
              (message.kind === 'state' && message.state.kind === 'error')
            }
            spellCheck={false}
            autoCapitalize='none'
            autoCorrect='off'
            inputMode='url'
            className={`h-10 w-full min-w-0 rounded-[7px] border border-line-control bg-bg px-3 font-mono text-fg text-sm transition-[border-color,box-shadow] placeholder:text-fg-5 focus:border-[#3b3b41] focus:shadow-[0_0_0_3px_rgba(86,180,233,0.12)] focus:outline-none ${shake === 0 ? '' : shake % 2 === 1 ? 'shake' : 'shake-b'}`}
          />
          <button
            type='submit'
            aria-busy={busy}
            className='inline-flex h-10 flex-none items-center rounded-[7px] border border-signal bg-signal px-[18px] font-medium text-[13px] text-on-signal transition-colors hover:border-signal-hover hover:bg-signal-hover focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-2 active:translate-y-px'
          >
            {copy.submit}
          </button>
        </form>
        <Line message={message} submitted={submitted} />
      </div>
    </Operator>
  );
};

export default ClaimInput;
