// src/components/SignedOutFrame/SignedOutFrame.tsx
import type React from 'react';

type SignedOutFrameProps = {
  /** Where the page is, in the top bar. */
  crumb: string;
  children: React.ReactNode;
};

/** The app's ground and top bar for pages before sign in: the dot grid and one breadcrumb. */
const SignedOutFrame: React.FC<SignedOutFrameProps> = ({ crumb, children }) => (
  <>
    <div aria-hidden='true' className='dot-grid pointer-events-none fixed inset-0' />
    <div className='relative flex min-w-0 flex-1 flex-col'>
      <header className='sticky top-0 z-20 h-13 border-line border-b bg-[rgb(10_10_11/0.82)] backdrop-blur-[10px]'>
        <div className='page-wrap flex h-full items-center'>
          <span aria-current='page' className='text-[13px] text-fg'>
            {crumb}
          </span>
        </div>
      </header>
      <main id='main' className='relative flex flex-1 flex-col'>
        {children}
      </main>
    </div>
  </>
);

export default SignedOutFrame;
