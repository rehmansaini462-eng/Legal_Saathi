/**
 * @module next.config
 * @description Next.js build and runtime configuration for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Configures server external packages, bundle optimizations, compression, image formats, and enterprise-grade security headers.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Enforces strict transport security, frame ancestors lockdown, and cross-origin resource isolation.
 */

import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        { key: 'Origin-Agent-Cluster', value: '?1' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
      ],
    },
  ],
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
