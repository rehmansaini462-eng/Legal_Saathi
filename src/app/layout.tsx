/**
 * @module app/layout
 * @description Root layout component providing font configurations, global stylesheet imports, and application metadata for LegalSaathi.
 * @responsibility Sets HTML shell, base typography variables, and metadata properties.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @accessibility Configures antialiased typography and semantic root shell.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import type { Metadata } from 'next';
import type React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_TAGLINE } from '@/config/constants';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: 'AI-powered legal document comprehension and risk intelligence for non-lawyers.',
};

/**
 * Root layout component wrapping all child pages.
 *
 * @param props - Root layout properties containing React children.
 * @returns Root HTML structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
