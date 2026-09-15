// src/components/ClaimStatusLive/ClaimStatusLive.tsx
'use client';

import type React from 'react';
import CheckNow from '@/components/CheckNow/CheckNow';
import { useCheck } from '@/components/CheckRunner/CheckRunner';
import ClaimStatus from '@/components/ClaimStatus/ClaimStatus';
import type { ClaimMessage, StatusMessage } from '@/lib/claims/messages';

type ClaimStatusLiveProps = {
  name: string;
  /**
   * The claim as its row has it, rendered on the server. It is what the page can say before any
   * check has answered, and it is replaced by the check rather than waited for, so a claim that
   * verifies never shows PENDING above its own verified result.
   */
  initial: StatusMessage;
};

/** The status block, kept level with the running check, with the control that re-runs it. */
const ClaimStatusLive: React.FC<ClaimStatusLiveProps> = ({ name, initial }) => {
  const { view } = useCheck();
  const message: StatusMessage | ClaimMessage = view === null ? initial : view.status;

  return <ClaimStatus name={name} message={message} action={<CheckNow />} />;
};

export default ClaimStatusLive;
