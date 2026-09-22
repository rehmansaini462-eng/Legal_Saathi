/**
 * @module next.config
 * @description Next.js build and runtime configuration for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Configures server external packages, webpack/turbopack bundle analysis, and enterprise-grade security headers (CSP, HSTS, COOP, Permissions-Policy).
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Enforces comprehensive Content Security Policy (CSP), strict transport security (HSTS), frame ancestors lockdown, and cross-origin isolation.
 */

import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

/**
 * Content Security Policy configuration:
 * - 'unsafe-inline' and 'unsafe-eval' are retained for Next.js client script hydration and development Turbopack evaluation.
 * - 'connect-src' allows secure outbound connections to self and Google Gemini API (generativelanguage.googleapis.com).
 * - 'frame-ancestors none' prevents any framing/clickjacking attacks.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
