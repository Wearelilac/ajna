/**
 * W1.1: Root Layout with Auth + Navigation
 */

import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import { Navigation } from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ajna - Privacy-First Population Health',
  description: 'Wearable resilience tracking, acoustic monitoring, and population health aggregation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
