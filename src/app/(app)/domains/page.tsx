// src/app/(app)/domains/page.tsx
import type { Metadata } from 'next';
import type React from 'react';
import DomainsScreen from '@/screens/DomainsScreen/DomainsScreen';

export const metadata: Metadata = {
  title: 'Domains',
};

const DomainsPage: React.FC = () => <DomainsScreen />;

export default DomainsPage;
