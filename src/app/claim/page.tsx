// src/app/claim/page.tsx
import { redirect } from 'next/navigation';
import { DOMAINS_PATH } from '@/lib/claims/config';

/** Claiming moved to the domains screen. Old links land there. */
const ClaimPage = () => redirect(DOMAINS_PATH);

export default ClaimPage;
