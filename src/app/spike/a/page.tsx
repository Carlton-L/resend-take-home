// src/app/spike/a/page.tsx
import type React from 'react';
import SpikeList from '@/screens/SpikeList/SpikeList';

/**
 * Renders the screen with no props. Passing the page's params or searchParams promises through
 * would make the route dynamic, which is what the spike is checking does not happen.
 */
const SpikeListPage: React.FC = () => <SpikeList />;

export default SpikeListPage;
