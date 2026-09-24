// src/app/(app)/layout.tsx
import type React from 'react';
import AppShell from '@/screens/AppShell/AppShell';

type AppLayoutProps = {
  children: React.ReactNode;
};

/** Renders the shell and nothing else. It reads no session and loads no data. */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => <AppShell>{children}</AppShell>;

export default AppLayout;
