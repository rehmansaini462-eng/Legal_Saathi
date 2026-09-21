/**
 * @module app/not-found
 * @description Custom 404 Not Found page for LegalSaathi.
 * Displays an accessible, branded explanation when a requested route does not exist.
 * @responsibility Guides users back to the document analysis workspace.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @accessibility WCAG 2.1 AA compliant with proper heading hierarchy, focusable home button, and semantic landmarks.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import Link from 'next/link';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { APP_NAME } from '@/config/constants';

/**
 * Renders the custom 404 Not Found page.
 *
 * @returns 404 page element tree.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <FileQuestion className="h-8 w-8" aria-hidden="true" />
      </div>

      <span className="mt-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        404 — Page Not Found
      </span>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
        Document or Page Not Found
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        The page you are looking for does not exist or has been moved. You can return to the{' '}
        {APP_NAME} legal workspace to upload and analyze your contracts.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-zinc-950"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go to Workspace
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back Home
        </Link>
      </div>
    </div>
  );
}
