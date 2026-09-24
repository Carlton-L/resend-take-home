// src/app/spike/layout.tsx
import type React from 'react';
import SpikeShell from '@/screens/SpikeShell/SpikeShell';
import './spike.css';

type SpikeLayoutProps = {
  children: React.ReactNode;
};

/** Spike only. Thin on purpose: renders the client shell and reads nothing. */
const SpikeLayout: React.FC<SpikeLayoutProps> = ({ children }) => (
  <SpikeShell>{children}</SpikeShell>
);

export default SpikeLayout;
