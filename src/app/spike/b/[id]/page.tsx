// src/app/spike/b/[id]/page.tsx
import type React from 'react';
import SpikeDetail from '@/screens/SpikeDetail/SpikeDetail';

/** The id is read in the screen with useParams, so the page takes nothing. */
const SpikeDetailPage: React.FC = () => <SpikeDetail />;

export default SpikeDetailPage;
