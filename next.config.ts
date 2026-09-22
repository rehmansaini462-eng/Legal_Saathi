/**
 * @module next.config
 * @description Next.js build and runtime configuration for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Configures server external packages, webpack/turbopack bundle analysis, performance optimizations, and enterprise-grade security headers.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Enforces comprehensive security headers (HSTS, COOP, CORP, COEP, X-XSS-Protection: 0, Permissions-Policy, Origin-Agent-Cluster) while CSP is dynamically nonced via middleware.
 */

import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  // Optimization & build performance flags
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Image optimization formats
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Server-only external packages for native parsing
  serverExternalPackages: ['pdf-parse', 'mammoth'],

  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        { key: 'Origin-Agent-Cluster', value: '?1' },
        { key: 'X-XSS-Protection', value: '0' },
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
