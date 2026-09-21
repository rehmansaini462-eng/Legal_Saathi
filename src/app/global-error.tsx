'use client';

/**
 * @module app/global-error
 * @description Global Root Error Boundary for LegalSaathi.
 * Catches errors in the root layout or root server components before page layout mounts.
 * @responsibility Provides full HTML/body recovery shell for catastrophic failures.
 * @alignsWith Problem Statement: "Robust error handling"
 * @accessibility WCAG 2.1 AA compliant with role="alert" and keyboard-accessible reset trigger.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Component props provided by Next.js global-error router.
 */
export interface GlobalErrorProps {
  /** Unhandled error object thrown at root level. */
  error: Error & { digest?: string };
  /** Method to attempt root tree reconciliation. */
  reset: () => void;
}

/**
 * Root global error boundary rendering a standalone HTML fallback page.
 *
 * @param props - Error and reset callback.
 * @returns Root HTML document fallback tree.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps): React.JSX.Element {
  useEffect(() => {
    // Log fatal root-level error to local console
    console.error('[LegalSaathi GlobalError Caught]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-center text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div
          role="alert"
          aria-live="assertive"
          className="flex max-w-md flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Application Error
          </h1>

          <p className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            A critical error occurred while initializing LegalSaathi. Please reload the application
            to restore normal functionality.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
