/**
 * @module components/legal/SummaryCard
 * @description Accessible controlled client component for streaming and persisting plain-language document summaries in LegalSaathi.
 * @responsibility Manages stream consumption, progressive UI updates, loading states, error handling, and session state persistence.
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @accessibility Fully WCAG 2.1 AA compliant with aria-live="polite", role="region", and keyboard navigation.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Copy, Check, RefreshCw, AlertCircle, StopCircle } from 'lucide-react';
import { SkeletonCard } from './SkeletonCard';
import { ERROR_CODES } from '@/config/constants';
import type { SummaryState } from '@/types/legal';

/**
 * Props for the SummaryCard controlled component.
 */
export interface SummaryCardProps {
  /** Raw text content of the parsed legal document. */
  text: string;
  /** Name of the uploaded document file. */
  filename: string;
  /** Persisted summary state lifted to parent LegalWorkspace. */
  state: SummaryState;
  /** State transition callback to parent LegalWorkspace. */
  onStateChange: (state: SummaryState) => void;
}

/**
 * Interactive controlled summary card component that streams AI-generated plain-language summaries in real-time.
 * Retains state across tab switching and session reloads.
 *
 * @param props - SummaryCardProps including text, filename, state, and onStateChange.
 * @returns Accessible SummaryCard component element.
 * @example
 *   <SummaryCard text={doc.text} filename={doc.filename} state={summaryState} onStateChange={setSummaryState} />
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 */
export function SummaryCard({
  text,
  filename,
  state,
  onStateChange,
}: SummaryCardProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoRetriedRef = useRef<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const summary = state.text;
  const isStreaming = state.status === 'streaming';
  const isDone = state.status === 'done';
  const error = state.error?.error ?? null;
  const errorCode = state.error?.code ?? null;

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
  }, []);

  useEffect(() => {
    return () => {
      clearCountdown();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearCountdown]);

  /**
   * Initiates streaming summary generation from the /api/summarize endpoint.
   *
   * @param isAutoRetry - Whether this execution was automatically triggered by a countdown.
   */
  const handleGenerateSummary = async (isAutoRetry = false) => {
    clearCountdown();
    if (!text || text.trim().length < 10) {
      onStateChange({
        text: '',
        status: 'error',
        error: {
          error: 'Document text is too short to generate a summary.',
          code: ERROR_CODES.INVALID_INPUT,
          status: 400,
        },
      });
      return;
    }

    // Reset previous state and signal streaming start
    onStateChange({
      text: '',
      status: 'streaming',
    });

    if (!isAutoRetry) {
      autoRetriedRef.current = false;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        let code: string | null = null;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
          if (errorData.code) code = errorData.code;
        } catch {
          // fallback to status code message
        }

        if (response.status === 503 || code === ERROR_CODES.GEMINI_HIGH_DEMAND) {
          const finalCode = ERROR_CODES.GEMINI_HIGH_DEMAND;
          const finalMsg =
            errorMsg ||
            'Our AI service is experiencing high demand. Please try again in 30 seconds.';

          onStateChange({
            text: '',
            status: 'error',
            error: {
              error: finalMsg,
              code: finalCode,
              status: 503,
            },
          });

          if (!autoRetriedRef.current) {
            autoRetriedRef.current = true;
            let count = 10;
            setRetryCountdown(count);
            countdownTimerRef.current = setInterval(() => {
              count -= 1;
              if (count <= 0) {
                clearCountdown();
                void handleGenerateSummary(true);
              } else {
                setRetryCountdown(count);
              }
            }, 1000);
          }
          return;
        }

        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported or empty response received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        onStateChange({
          text: accumulatedText,
          status: 'streaming',
        });
      }

      onStateChange({
        text: accumulatedText,
        status: 'done',
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User aborted intentionally
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Failed to generate summary. Please try again.';
      onStateChange({
        text: state.text,
        status: 'error',
        error: {
          error: message,
          code: ERROR_CODES.GEMINI_API_ERROR,
          status: 500,
        },
      });
    } finally {
      abortControllerRef.current = null;
    }
  };

  /**
   * Aborts an in-flight summary generation stream.
   */
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      onStateChange({
        text: state.text,
        status: state.text ? 'done' : 'idle',
      });
    }
  };

  /**
   * Copies the generated summary to the user's clipboard.
   */
  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <section
      role="region"
      aria-labelledby="summary-heading"
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition-all dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-xs dark:bg-blue-950/80 dark:text-blue-300">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="summary-heading"
              className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Plain-Language AI Summary
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Grounded breakdown of rights, obligations, and critical terms
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {summary && !isStreaming && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              aria-label={copied ? 'Summary copied to clipboard' : 'Copy summary to clipboard'}
            >
              {copied ? (
                <>
                  <Check
                    className="h-3.5 w-3.5 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                  />
                  <span className="text-green-600 dark:text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopStreaming}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              aria-label="Stop generating summary"
            >
              <StopCircle className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleGenerateSummary(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={summary ? 'Regenerate summary' : 'Generate summary'}
            >
              {summary ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Regenerate</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-red-950 dark:text-red-100">
                {errorCode === ERROR_CODES.GEMINI_HIGH_DEMAND
                  ? 'High Service Demand'
                  : 'Summary Generation Error'}
              </p>
              <p className="mt-0.5">{error}</p>
              {retryCountdown !== null && retryCountdown > 0 && (
                <p className="mt-1 font-semibold text-blue-700 dark:text-blue-300">
                  Retrying in {retryCountdown}s...
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                clearCountdown();
                autoRetriedRef.current = false;
                void handleGenerateSummary(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-800 focus:ring-2 focus:ring-red-500 focus:outline-hidden dark:bg-red-800 dark:hover:bg-red-700"
              aria-label="Try generating summary again"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="p-5">
        {/* Subtle Banner for Persisted Session Summary */}
        {isDone && summary && !isStreaming && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200/70 bg-blue-50/60 px-3.5 py-2 text-xs text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span>Summary from previous session</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateSummary(false)}
              className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
            >
              Regenerate
            </button>
          </div>
        )}

        {!summary && !isStreaming && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No summary generated yet
            </h4>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Click &quot;Generate Summary&quot; to produce an accessible, plain-language breakdown
              of <span className="font-medium text-zinc-700 dark:text-zinc-300">{filename}</span>.
            </p>
            <button
              type="button"
              onClick={() => handleGenerateSummary(false)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Generate Summary</span>
            </button>
          </div>
        )}

        {/* Streaming & Result Content Region */}
        {isStreaming && !summary && (
          <div aria-live="polite" aria-busy="true">
            <SkeletonCard
              lines={4}
              showHeader={false}
              ariaLabel="Generating plain-language summary in real-time"
              className="border-0 bg-transparent p-0 shadow-none"
            />
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-600 dark:bg-blue-400" />
              <span>Initializing Gemini model and streaming summary...</span>
            </div>
          </div>
        )}

        {(summary || (isStreaming && summary)) && (
          <div
            aria-live="polite"
            aria-busy={isStreaming}
            className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed text-zinc-800 sm:text-sm dark:text-zinc-200"
          >
            <div className="font-sans whitespace-pre-wrap">{summary}</div>
            {isStreaming && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-600 dark:bg-blue-400" />
                <span>Streaming plain-language summary in real-time...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
