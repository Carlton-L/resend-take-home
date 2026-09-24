// src/app/(app)/claim/[id]/page.tsx
import type { Metadata } from 'next';
import type React from 'react';
import ClaimScreen from '@/screens/ClaimScreen/ClaimScreen';

export const metadata: Metadata = {
  title: 'Claim',
};

/**
 * No ids at build time. Each id renders once on its first request and is served as static after
 * that, so a link to a claim can be prefetched and opens with no server round trip. The screen
 * reads its id with useParams and fetches the claim itself.
 */
export const generateStaticParams = async (): Promise<{ id: string }[]> => [];

const ClaimPage: React.FC = () => <ClaimScreen />;

export default ClaimPage;
