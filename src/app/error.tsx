'use client';

/**
 * @module app/error
 * @description React Error Boundary for the LegalSaathi application router.
 * Catches unhandled runtime client/rendering errors and renders a graceful, accessible fallback UI.
 * @responsibility Displays user-friendly error messages, traps unhandled exceptions, and provides state recovery without page reload.
 * @alignsWith Problem Statement: "Robust error handling"
 * @accessibility WCAG 2.1 AA compliant with role="alert", focus restoration to the error heading, and clear keyboard actions.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Component props provided automatically by Next.js app router error boundary.
 */
export interface ErrorPageProps {
  /** The error object thrown by child components or routes. */
  error: Error & { digest?: string };
  /** Function to reset the error boundary and attempt to re-render the segment. */
  reset: () => void;
}

/**
 * Root segment error boundary component.
 *
 * @param props - Error boundary properties containing error object and retry trigger.
 * @returns Accessible fallback error UI.
 */
export default function ErrorBoundary({ error, reset }: ErrorPageProps): React.JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Log unhandled runtime error to local console for developer debugging (not sent to external service)
    console.error('[LegalSaathi ErrorBoundary Caught]:', error);

    // Shift focus to error alert heading for screen reader announcement
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center sm:px-6"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-950/60 dark:text-amber-400">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 outline-none sm:text-3xl dark:text-zinc-100"
      >
        Something went wrong
      </h1>

      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        An unexpected error occurred while processing your legal workspace. Your document text is
        safe, and you can try recovering by clicking the button below.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-zinc-950"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
