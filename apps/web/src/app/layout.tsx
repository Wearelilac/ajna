import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ajna — Catching Acute Crises Before They Become Cases',
  description:
    'Future Health Digital Innovation Challenge (Hack2Scale). Privacy-first wearable resilience, on-device acoustic review, and K-anonymous population health. Advisory only. Humans always in the loop.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-sand-900 bg-sand-0">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
