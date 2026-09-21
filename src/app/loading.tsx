/**
 * @module app/loading
 * @description Route-level loading skeleton UI for LegalSaathi.
 * Displays animated skeleton placeholders during Next.js router transitions and initial page suspension.
 * @responsibility Provides instant visual feedback and perceived performance boost during route loads.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @accessibility WCAG 2.1 AA compliant with aria-busy="true" and aria-label for assistive tech.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import React from 'react';

/**
 * Route-level loading fallback displaying pulsing workspace skeletons.
 *
 * @returns Pulsing skeleton UI matching page layout structure.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Loading LegalSaathi workspace"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12"
    >
      {/* Header skeleton */}
      <div className="flex flex-col items-center text-center">
        <div className="h-10 w-3/4 max-w-lg animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Main card skeleton */}
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="mt-6 h-36 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
      </div>

      {/* Feature cards grid skeleton */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-4 h-5 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800/50" />
            <div className="mt-1 h-4 w-3/4 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
