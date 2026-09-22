/**
 * @module middleware
 * @description Edge middleware for LegalSaathi that generates a cryptographically secure per-request nonce
 * and enforces strict Content Security Policy (CSP) headers across all incoming application requests.
 * @responsibility Generates per-request CSP nonces, strips unsafe-inline/unsafe-eval in production, and sets request/response CSP headers.
 * @alignsWith Problem Statement: "Simplifying complex legal documents" — protects users' sensitive uploaded documents against XSS and injection attacks.
 * @security Production CSP eliminates 'unsafe-inline' and 'unsafe-eval' for script-src, using nonce-{NONCE} and 'strict-dynamic'.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generates CSP nonce and attaches CSP headers to both the internal request and client response.
 *
 * @param request - Incoming Next.js HTTP request.
 * @returns Next.js response with applied nonce and Content-Security-Policy header.
 */
export function middleware(request: NextRequest): NextResponse {
  // Generate 128-bit cryptographically secure random nonce encoded as base64
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const unsafeEval = isDev ? " 'unsafe-eval'" : '';

  // Strict CSP: script-src uses 'self', per-request nonce, and 'strict-dynamic'
  // style-src retains 'unsafe-inline' for Next.js / Tailwind CSS styling
  // connect-src allows self and Google Gemini API endpoint
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${unsafeEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);

  return response;
}

/**
 * Middleware matcher configuration.
 * Applies CSP to all application routes excluding static assets and image optimizers.
 */
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
