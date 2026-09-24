// src/client/queries.ts
import useSWR from 'swr';
import { CLAIMS_KEY, claimKey, fetchClaim, fetchClaims, fetchMe, ME_KEY } from '@/client/api';

/** Who is signed in. Read once and kept for the session. */
export const useMe = () =>
  useSWR(ME_KEY, fetchMe, { revalidateOnFocus: false, revalidateIfStale: false });

/** The account's claims. Refetched on focus, and patched by every check and create. */
export const useClaims = () => useSWR(CLAIMS_KEY, fetchClaims);

/** One claim, for its own screen. */
export const useClaim = (id: string | null) =>
  useSWR(id === null ? null : claimKey(id), () => fetchClaim(id as string));
