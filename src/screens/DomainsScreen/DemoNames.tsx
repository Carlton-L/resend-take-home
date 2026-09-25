// src/screens/DomainsScreen/DemoNames.tsx
'use client';

import type React from 'react';
import { useId } from 'react';
import Pill from '@/components/Pill/Pill';
import { claimCopy } from '@/lib/claims/messages';
import type { Tone } from '@/lib/claims/row';
import { useMenu } from '@/lib/hooks/useMenu';

const TONE: Record<'good' | 'attention' | 'neutral', Tone> = {
  good: 'good',
  attention: 'warn',
  neutral: 'wait',
};

type DemoNamesProps = {
  /** Fills the claim field with the name picked. */
  onPick: (name: string) => void;
};

/**
 * The scripted `.test` names, each with what it does, so a reviewer can reach every outcome
 * without owning a broken domain. Picking one fills the field. Claiming is still the button.
 */
const DemoNames: React.FC<DemoNamesProps> = ({ onPick }) => {
  const { open, triggerRef, menuRef, toggle, close } = useMenu();
  const menuId = useId();
  const copy = claimCopy.demo;

  return (
    <div className='relative mt-1.5 flex h-6 items-center'>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className='-ml-1 inline-flex h-6 items-center gap-1 rounded-[5px] px-1 font-mono text-[11.5px] text-fg-3 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-wait focus-visible:outline-offset-1'
      >
        {copy.button}
        <svg
          aria-hidden='true'
          width='10'
          height='10'
          viewBox='0 0 10 10'
          fill='none'
          className={`transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <path
            d='M2.5 3.75l2.5 2.5 2.5-2.5'
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role='menu'
          aria-label={copy.menu}
          className='absolute top-full left-0 z-30 mt-1 max-h-[min(440px,60vh)] w-[460px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-[9px] border border-line-2 bg-surface-2 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]'
        >
          {copy.names.map((item) => (
            <button
              key={item.name}
              type='button'
              role='menuitem'
              onClick={() => {
                close();
                onPick(item.name);
              }}
              className='grid w-full gap-1 rounded-[6px] px-2.5 py-2 text-left hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none'
            >
              <span className='flex items-center justify-between gap-3'>
                <code className='font-mono text-[12.5px] text-fg'>{item.name}</code>
                <Pill tone={TONE[item.tone]} className='flex-none'>
                  {item.label}
                </Pill>
              </span>
              <span className='text-[12px] text-fg-3 leading-snug'>{item.line}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemoNames;
