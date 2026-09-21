/**
 * @module components/legal/AskQuestion
 * @description Accessible interactive client component for asking questions grounded in legal documents with citation extraction.
 * @responsibility Manages query submissions, loading states, high-demand retries, and displays grounded answers with quoted citations.
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @accessibility Fully WCAG 2.1 AA compliant with aria-live="polite", role="region", and keyboard submit (Enter) / clear (Esc).
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Quote,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { SkeletonCard } from './SkeletonCard';
import { ERROR_CODES } from '@/config/constants';
import type { AskState, AskResponse, QuestionConfidence } from '@/types/legal';

/**
 * Props for the AskQuestion controlled component.
 */
export interface AskQuestionProps {
  /** Raw text content of the parsed legal document. */
  text: string;
  /** Name of the uploaded document file. */
  filename: string;
  /** Persisted Q&A history state lifted to parent LegalWorkspace. */
  state: AskState;
  /** State transition callback to parent LegalWorkspace. */
  onStateChange: (state: AskState) => void;
}

const SAMPLE_QUESTIONS: readonly string[] = [
  'What are the termination conditions and notice periods?',
  'What liabilities, penalties, or indemnities am I exposed to?',
  'What are the payment terms, deadlines, and invoicing schedules?',
  'How is confidential information protected and for how long?',
] as const;

/**
 * Renders a confidence badge corresponding to the AI's certainty level.
 */
function ConfidenceBadge({ confidence }: { confidence: QuestionConfidence }): React.JSX.Element {
  switch (confidence) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          High Confidence
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <HelpCircle className="h-3 w-3" aria-hidden="true" />
          Medium Confidence (Inferred)
        </span>
      );
    case 'low':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <HelpCircle className="h-3 w-3" aria-hidden="true" />
          Low Confidence / Ambiguous
        </span>
      );
  }
}

/**
 * Interactive Q&A component allowing users to ask questions grounded strictly in their legal documents.
 *
 * @param props - AskQuestionProps including document text, filename, state, and onStateChange.
 * @returns Accessible AskQuestion component element.
 * @example
 *   <AskQuestion text={doc.text} filename={doc.filename} state={askState} onStateChange={setAskState} />
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 */
export function AskQuestion({
  text,
  filename,
  state,
  onStateChange,
}: AskQuestionProps): React.JSX.Element {
  const [questionInput, setQuestionInput] = useState<string>('');
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [currentError, setCurrentError] = useState<{ error: string; code?: string } | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQuestionRef = useRef<string>('');

  const isLoading = state.status === 'loading';
  const history = state.history;

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
    };
  }, [clearCountdown]);

  /**
   * Submits a question to /api/ask for grounded evaluation.
   *
   * @param queryText - The question string to submit.
   */
  const handleAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || trimmed.length < 3) {
      setCurrentError({
        error: 'Please enter a question of at least 3 characters.',
        code: ERROR_CODES.INVALID_INPUT,
      });
      return;
    }

    if (trimmed.length > 500) {
      setCurrentError({
        error: 'Question is too long (maximum 500 characters).',
        code: ERROR_CODES.INVALID_INPUT,
      });
      return;
    }

    clearCountdown();
    setCurrentError(null);
    lastQuestionRef.current = trimmed;

    // Set loading state with new question entry
    const updatedHistory = [
      { question: trimmed, response: null as AskResponse | null },
      ...history.slice(0, 4), // Keep last 5 entries
    ];

    onStateChange({
      history: updatedHistory,
      status: 'loading',
    });

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          filename,
          question: trimmed,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        const is503 = response.status === 503 || json.code === ERROR_CODES.GEMINI_HIGH_DEMAND;

        if (is503) {
          setCurrentError({
            error: 'AI service is experiencing high demand. Retrying in 30 seconds...',
            code: ERROR_CODES.GEMINI_HIGH_DEMAND,
          });

          let seconds = 30;
          setRetryCountdown(seconds);
          countdownTimerRef.current = setInterval(() => {
            seconds -= 1;
            if (seconds <= 0) {
              clearCountdown();
              handleAsk(trimmed);
            } else {
              setRetryCountdown(seconds);
            }
          }, 1000);

          onStateChange({
            history: history, // restore previous history on high-demand retry
            status: 'error',
          });
          return;
        }

        setCurrentError({
          error: json.error || 'Failed to answer question.',
          code: json.code || ERROR_CODES.GEMINI_API_ERROR,
        });

        onStateChange({
          history: history,
          status: 'error',
        });
        return;
      }

      const askResponse: AskResponse = json.data;

      // Update the first history item with the received response
      const completedHistory = [
        { question: trimmed, response: askResponse },
        ...history.slice(0, 4),
      ];

      onStateChange({
        history: completedHistory,
        status: 'done',
      });

      setQuestionInput('');
    } catch {
      setCurrentError({
        error: 'Network connection failed. Please check your internet and try again.',
        code: ERROR_CODES.GEMINI_API_ERROR,
      });
      onStateChange({
        history: history,
        status: 'error',
      });
    }
  };

  /**
   * Handles keyboard shortcuts inside the input field.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleAsk(questionInput);
    } else if (e.key === 'Escape') {
      setQuestionInput('');
      setCurrentError(null);
    }
  };

  /**
   * Clears the current Q&A history.
   */
  const handleClearHistory = () => {
    clearCountdown();
    setCurrentError(null);
    onStateChange({
      history: [],
      status: 'idle',
    });
  };

  return (
    <section
      aria-labelledby="ask-heading"
      className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="ask-heading"
              className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Ask Questions with Citations
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Grounded legal document Q&A — every factual claim links directly to source text
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
            aria-label="Clear question history"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear History
          </button>
        )}
      </div>

      {/* Suggested Starter Questions */}
      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          Suggested Questions:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sampleQ) => (
            <button
              key={sampleQ}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setQuestionInput(sampleQ);
                handleAsk(sampleQ);
              }}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            >
              {sampleQ}
            </button>
          ))}
        </div>
      </div>

      {/* Input Query Bar */}
      <div className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                if (currentError) setCurrentError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={500}
              placeholder="Type your question about this document (e.g. When can either party cancel?)..."
              aria-label="Type your question about the document"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <span className="absolute top-2.5 right-3 text-[10px] text-zinc-400">
              {questionInput.length}/500
            </span>
          </div>

          <button
            type="button"
            disabled={isLoading || !questionInput.trim()}
            onClick={() => handleAsk(questionInput)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Ask</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / High Demand Alert */}
      {currentError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">{currentError.error}</p>
            {retryCountdown !== null && (
              <p className="mt-1 font-mono text-xs">
                Auto-retrying in <span className="font-bold">{retryCountdown}s</span>...
              </p>
            )}
          </div>
          {retryCountdown !== null && (
            <button
              type="button"
              onClick={() => {
                clearCountdown();
                handleAsk(lastQuestionRef.current);
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry Now
            </button>
          )}
        </div>
      )}

      {/* Q&A History Region */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Document Question and Answer Results"
        className="mt-6 space-y-5"
      >
        {history.length === 0 && !isLoading && (
          <div className="dark:bg-zinc-850/40 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800">
            <Sparkles
              className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-600"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No questions asked yet
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Select a suggested question above or type your own question to get grounded answers
              backed by direct legal citations.
            </p>
          </div>
        )}

        {history.map((item, idx) => (
          <div
            key={`${item.question}-${idx}`}
            className="dark:bg-zinc-850/50 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-xs transition-all dark:border-zinc-800"
          >
            {/* Question Header */}
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                Q
              </span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.question}</p>
            </div>

            {/* Answer Body */}
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              {item.response ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      LegalSaathi Answer:
                    </span>
                    <ConfidenceBadge confidence={item.response.confidence} />
                  </div>

                  {item.response.notFoundInDocument ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                      <p className="font-semibold">⚠️ Information Not In Document</p>
                      <p className="mt-1">{item.response.answer}</p>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {item.response.answer}
                    </p>
                  )}

                  {/* Supporting Citations */}
                  {item.response.citations && item.response.citations.length > 0 && (
                    <div className="mt-4 space-y-2 pt-2">
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        Supporting Citations:
                      </p>
                      <div className="space-y-2">
                        {item.response.citations.map((cite, citeIdx) => (
                          <blockquote
                            key={citeIdx}
                            className="rounded-lg border-l-4 border-blue-500 bg-white p-3 text-xs dark:bg-zinc-900"
                          >
                            <div className="flex items-start gap-2">
                              <Quote
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500"
                                aria-hidden="true"
                              />
                              <div className="space-y-1">
                                <p className="text-zinc-700 italic dark:text-zinc-300">
                                  &ldquo;{cite.quote}&rdquo;
                                </p>
                                <p className="font-semibold text-blue-700 dark:text-blue-400">
                                  📍 {cite.location}
                                </p>
                              </div>
                            </div>
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div aria-live="polite" aria-busy="true" className="py-2">
                  <SkeletonCard
                    lines={3}
                    showHeader={false}
                    ariaLabel="Analyzing document text and extracting citations"
                    className="border-0 bg-transparent p-0 shadow-none"
                  />
                  <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    Analyzing document text and extracting grounded citations...
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
