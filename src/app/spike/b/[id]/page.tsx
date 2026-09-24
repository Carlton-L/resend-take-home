// src/app/spike/b/[id]/page.tsx
import type React from 'react';
import SpikeDetail from '@/screens/SpikeDetail/SpikeDetail';

/**
 * No ids at build time. Each id renders once on first request and is then served as static, so a
 * link to it can be prefetched and a click paints without a server round trip.
 */
export const generateStaticParams = async (): Promise<{ id: string }[]> => [];

/** The id is read in the screen with useParams, so the page takes nothing. */
const SpikeDetailPage: React.FC = () => <SpikeDetail />;

export default SpikeDetailPage;
