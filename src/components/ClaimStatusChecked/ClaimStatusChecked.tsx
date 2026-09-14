// src/components/ClaimStatusChecked/ClaimStatusChecked.tsx
import type React from 'react';
import ClaimStatus from '@/components/ClaimStatus/ClaimStatus';
import type { ClaimOutcome } from '@/lib/claims/check';
import { describeClaim } from '@/lib/claims/messages';

type ClaimStatusCheckedProps = {
  name: string;
  outcome: Promise<ClaimOutcome>;
};

/**
 * The status block, once the check has been through the database.
 *
 * This is the resolved half of a Suspense pair. The fallback is the same block rendered from the
 * claim row, which is what the page shell can say straight away, and this replaces it when the
 * check lands. A claim that verifies during the render is the case it exists for: the row said
 * pending when the shell went out and the pill has to stop saying so.
 *
 * It awaits the same promise the check does. The page creates it once, so nothing here runs a
 * second trace or a second write.
 */
const ClaimStatusChecked: React.FC<ClaimStatusCheckedProps> = async ({ name, outcome }) => {
  return <ClaimStatus name={name} message={describeClaim(await outcome)} />;
};

export default ClaimStatusChecked;
