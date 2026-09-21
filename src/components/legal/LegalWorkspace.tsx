/**
 * @module components/legal/LegalWorkspace
 * @description Central client-side legal document workspace container for LegalSaathi.
 * Orchestrates parsing state, error handling, and visual document inspection workflows.
 * @responsibility Coordinates parsed document states, error displays, and document preview updates.
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 * @accessibility Fully WCAG 2.1 AA compliant with semantic sectioning and accessible error alert regions.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';
import { DocumentPreview } from './DocumentPreview';
import type { ApiError, ParsedDocument } from '@/types/legal';

/**
 * Interactive workspace component managing document upload state, API error handling, and preview rendering.
 *
 * @returns Complete client-side legal document processing workspace.
 * @example
 *   <LegalWorkspace />
 */
export function LegalWorkspace(): React.JSX.Element {
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Handles successful document parsing.
   */
  const handleParsed = (doc: ParsedDocument) => {
    setParsedDoc(doc);
    setError(null);
  };

  /**
   * Handles upload or parsing failure.
   */
  const handleError = (err: ApiError) => {
    setError(err);
    setParsedDoc(null);
  };

  /**
   * Clears the current active error.
   */
  const handleDismissError = () => {
    setError(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Document Uploader */}
      <DocumentUploader onParsed={handleParsed} onError={handleError} />

      {/* Error Alert Display */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-red-950 dark:text-red-100">
                Processing Error ({error.code || 'ERROR'})
              </p>
              <p className="mt-0.5 text-red-800 dark:text-red-300">{error.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissError}
            aria-label="Dismiss error notice"
            className="rounded-lg p-1 text-red-700 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            <XCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Document Preview */}
      <DocumentPreview doc={parsedDoc} />
    </div>
  );
}
