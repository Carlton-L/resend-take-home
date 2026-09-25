// src/app/demo/page.tsx
import type { Metadata } from 'next';
import type React from 'react';
import SignInDemo from '@/screens/SignInDemo/SignInDemo';

export const metadata: Metadata = {
  title: 'Demo',
  robots: { index: false, follow: false },
};

/** The sign in screen's demo, on its own page so a frame can show it at a desktop width. */
const DemoPage: React.FC = () => <SignInDemo />;

export default DemoPage;
