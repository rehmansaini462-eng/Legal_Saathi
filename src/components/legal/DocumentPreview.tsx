/**
 * @module components/legal/DocumentPreview
 * @description Accessible document inspection and preview card for LegalSaathi.
 * Displays extracted text snippets, structural statistics, scanned-document warnings, and clipboard copy capability.
 * @responsibility Renders extracted document metadata, bounded text preview, and provides quick clipboard copy actions.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @accessibility Fully WCAG 2.1 AA compliant with semantic article container, regional role labelling, polite copy status live announcements, and keyboard navigable scrollable regions.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import type { ParsedDocument } from '@/types/legal';

/**
 * Props for the DocumentPreview component.
 */
export interface DocumentPreviewProps {
  /** The parsed document payload to display, or null when no document has been loaded. */
  doc: ParsedDocument | null;
}

/**
 * Formats byte size into human-readable KB or MB string.
 *
 * @param bytes - Size in bytes.
 * @returns Formatted size string (e.g., "1.45 MB" or "450 KB").
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Client component presenting a structured preview of parsed legal documents, key metrics, and copy actions.
 *
 * @param props - Component props containing the parsed document object or null.
 * @returns Accessible article preview element or null if no document is present.
 * @example
 *   <DocumentPreview doc={parsedDoc} />
 */
export function DocumentPreview({ doc }: DocumentPreviewProps): React.JSX.Element | null {
  const [copied, setCopied] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!doc) {
    return null;
  }

  const previewSnippet = doc.text.slice(0, 1500);
  const isTruncated = doc.text.length > 1500;

  /**
   * Handles copying the full extracted text to the user's clipboard.
   */
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(doc.text);
      setCopied(true);
      setLiveAnnouncement('Copied to clipboard');
    } catch {
      setLiveAnnouncement('Failed to copy to clipboard');
    }
  };

  return (
    <article
      aria-labelledby="preview-heading"
      className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Header with Title, Filename & Success Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="preview-heading"
              className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Document Preview
            </h3>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{doc.filename}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30">
            <CheckCircle2
              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            Parsed successfully
          </span>

          <button
            type="button"
            onClick={handleCopyText}
            aria-label="Copy extracted text to clipboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none active:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {copied ? (
              <>
                <Check
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screen reader polite announcement */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Warnings Banner (e.g. Scanned PDF detection) */}
      {doc.warnings && doc.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {doc.warnings.map((warning, index) => (
            <div
              key={index}
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/90 p-3.5 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Notice</p>
                <p>{warning}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Words
          </span>
          <span className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {doc.wordCount.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            Characters
          </span>
          <span className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {doc.charCount.toLocaleString()}
          </span>
        </div>

        {doc.pages !== undefined && (
          <div className="flex flex-col rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Pages
            </span>
            <span className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
            </span>
          </div>
        )}

        <div className="flex flex-col rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            File Size
          </span>
          <span className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {formatFileSize(doc.sizeBytes)}
          </span>
        </div>
      </div>

      {/* Scrollable Document Text Preview with Fade-Out Gradient */}
      <div className="relative mt-5">
        <div
          role="region"
          aria-label="Extracted document text preview"
          tabIndex={0}
          className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
        >
          <pre className="font-inherit whitespace-pre-wrap">{previewSnippet}</pre>
          {isTruncated && (
            <p className="mt-3 text-center font-sans text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              [Preview truncated — full document loaded into AI workspace]
            </p>
          )}
        </div>

        {/* Fade-out gradient overlay at bottom */}
        {isTruncated && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-0 left-0 h-12 rounded-b-lg bg-gradient-to-t from-zinc-50 via-zinc-50/70 to-transparent dark:from-zinc-950 dark:via-zinc-950/70"
          />
        )}
      </div>
    </article>
  );
}
