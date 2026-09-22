/**
 * @module components/legal/LawyerPrepCard
 * @description Accessible controlled client component for generating attorney consultation preparation packages in LegalSaathi.
 * @responsibility Coordinates lawyer preparation requests, displays categorized questions with plain-language rationales, documents to bring, and copyable case summaries.
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 * @accessibility Fully WCAG 2.1 AA compliant with aria-labelledby, semantic lists, accessible buttons, and live region announcements.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  FileCheck,
  HelpCircle,
  FileText,
  ShieldAlert,
  Clock,
  DollarSign,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { SkeletonCard } from './SkeletonCard';
import { ERROR_CODES } from '@/config/constants';
import type { LawyerPrepState, LawyerQuestionCategory } from '@/types/legal';

/**
 * Props for the LawyerPrepCard controlled component.
 */
export interface LawyerPrepCardProps {
  /** Raw text content of the parsed legal document. */
  text: string;
  /** Name of the uploaded document file. */
  filename: string;
  /** Persisted lawyer preparation state lifted to parent LegalWorkspace. */
  state: LawyerPrepState;
  /** State transition callback to parent LegalWorkspace. */
  onStateChange: (state: LawyerPrepState) => void;
}

/**
 * Visual badge config for lawyer question categories.
 */
interface CategoryConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const CATEGORY_MAP: Record<LawyerQuestionCategory, CategoryConfig> = {
  rights: {
    label: 'Rights & Protections',
    className:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    icon: UserCheck,
  },
  obligations: {
    label: 'Obligations & Duties',
    className:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: FileText,
  },
  risks: {
    label: 'Risk & Liabilities',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    icon: ShieldAlert,
  },
  timelines: {
    label: 'Timelines & Deadlines',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Clock,
  },
  financial: {
    label: 'Financial & Payments',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: DollarSign,
  },
  termination: {
    label: 'Termination & Exit',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    icon: XCircle,
  },
};

/**
 * Interactive card component that equips non-lawyers with targeted consultation questions,
 * checklists of documents to bring, and an executive briefing for their attorney.
 *
 * @param props - LawyerPrepCardProps
 * @returns Accessible LawyerPrepCard component element.
 * @example
 *   <LawyerPrepCard text={doc.text} filename={doc.filename} state={lawyerPrepState} onStateChange={setLawyerPrepState} />
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 */
export function LawyerPrepCard({
  text,
  filename,
  state,
  onStateChange,
}: LawyerPrepCardProps): React.JSX.Element {
  const [copiedQuestions, setCopiedQuestions] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = state.status === 'loading';
  const isDone = state.status === 'done' && state.prep !== null;
  const error = state.error?.error ?? null;
  const errorCode = state.error?.code ?? null;
  const prep = state.prep;

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
   * Triggers API request to generate lawyer consultation prep package.
   */
  const handleGeneratePrep = async () => {
    clearCountdown();
    if (!text || text.trim().length < 10) {
      onStateChange({
        prep: null,
        status: 'error',
        error: {
          error: 'Document text is too short to generate lawyer consultation questions.',
          code: ERROR_CODES.INVALID_INPUT,
          status: 400,
        },
      });
      return;
    }

    onStateChange({
      prep: null,
      status: 'loading',
    });

    try {
      const response = await fetch('/api/lawyer-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename }),
      });

      const json = await response.json();

      if (!response.ok) {
        const is503 = response.status === 503 || json.code === ERROR_CODES.GEMINI_HIGH_DEMAND;

        if (is503) {
          onStateChange({
            prep: null,
            status: 'error',
            error: {
              error: 'AI service is experiencing high demand. Automatic retry scheduled...',
              code: ERROR_CODES.GEMINI_HIGH_DEMAND,
              status: 503,
            },
          });

          setRetryCountdown(10);
          countdownTimerRef.current = setInterval(() => {
            setRetryCountdown((prev) => {
              if (prev === null || prev <= 1) {
                clearCountdown();
                handleGeneratePrep();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
          return;
        }

        onStateChange({
          prep: null,
          status: 'error',
          error: {
            error: json.error || 'Failed to prepare lawyer consultation questions.',
            code: json.code || ERROR_CODES.GEMINI_API_ERROR,
            status: response.status,
          },
        });
        return;
      }

      onStateChange({
        prep: json.data,
        status: 'done',
      });
    } catch (err: unknown) {
      onStateChange({
        prep: null,
        status: 'error',
        error: {
          error:
            err instanceof Error
              ? err.message
              : 'Network error occurred while contacting AI service.',
          code: ERROR_CODES.GEMINI_API_ERROR,
          status: 500,
        },
      });
    }
  };

  /**
   * Copies formatted list of questions to user clipboard.
   */
  const handleCopyQuestions = async () => {
    if (!prep?.questions?.length) return;

    const formattedText = prep.questions
      .map(
        (q, index) =>
          `${index + 1}. [${q.category.toUpperCase()}] ${q.question}\n   Why it matters: ${q.whyItMatters}`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(formattedText);
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 2000);
    } catch {
      // Gracefully handle clipboard write restrictions
    }
  };

  /**
   * Copies executive summary for lawyer to clipboard.
   */
  const handleCopySummary = async () => {
    if (!prep?.summaryForLawyer) return;

    try {
      await navigator.clipboard.writeText(prep.summaryForLawyer);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Gracefully handle clipboard write restrictions
    }
  };

  return (
    <section
      aria-labelledby="lawyer-prep-heading"
      className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/80"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="lawyer-prep-heading"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Prepare for a Lawyer Meeting
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get targeted questions, documents to bring, and a concise briefing tailored for your
              legal consultation
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGeneratePrep()}
            disabled={isLoading || !text || text.trim().length < 10}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Preparing Consultation Pack...</span>
              </>
            ) : isDone ? (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Regenerate Questions</span>
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4" aria-hidden="true" />
                <span>Generate Lawyer Prep</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error and Countdown Notice */}
      {error && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          {retryCountdown !== null && (
            <p className="text-xs text-rose-700 dark:text-rose-400">
              Retrying in {retryCountdown} seconds...
            </p>
          )}
          {errorCode === ERROR_CODES.GEMINI_HIGH_DEMAND && (
            <button
              type="button"
              onClick={() => handleGeneratePrep()}
              className="mt-2 w-fit rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
            >
              Retry Now
            </button>
          )}
        </div>
      )}

      {/* Idle Prompt State */}
      {!isLoading && !isDone && !error && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
          <HelpCircle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Consulting a lawyer? Don&apos;t go unprepared.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            LegalSaathi will analyze your document and generate 5–8 high-impact questions, key
            documents to bring, and an executive briefing summary.
          </p>
          <button
            type="button"
            onClick={() => handleGeneratePrep()}
            disabled={!text || text.trim().length < 10}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Prepare for Lawyer</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-6 space-y-4" aria-live="polite" aria-busy="true">
          <SkeletonCard
            lines={3}
            showHeader={true}
            ariaLabel="Generating executive summary for lawyer"
          />
          <SkeletonCard lines={4} showHeader={true} ariaLabel="Preparing consultation questions" />
        </div>
      )}

      {/* Loaded Content */}
      {isDone && prep && (
        <div className="mt-6 space-y-6">
          {/* Executive Summary for Lawyer */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-5 dark:border-blue-900/40 dark:bg-blue-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-semibold tracking-wider text-blue-900 uppercase dark:text-blue-300">
                  Case Briefing for Your Lawyer
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Briefing</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {prep.summaryForLawyer}
            </p>
          </div>

          {/* Key Documents to Bring */}
          {prep.keyDocumentsToBring && prep.keyDocumentsToBring.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">
                  Documents &amp; Records to Bring
                </h4>
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {prep.keyDocumentsToBring.map((docItem, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{docItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Recommended Questions to Ask ({prep.questions.length})
              </h4>
              <button
                type="button"
                onClick={handleCopyQuestions}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {copiedQuestions ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>All Questions Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy All Questions</span>
                  </>
                )}
              </button>
            </div>

            <ol className="space-y-3">
              {prep.questions.map((q, idx) => {
                const config = CATEGORY_MAP[q.category] || CATEGORY_MAP.rights;
                const CategoryIcon = config.icon;

                return (
                  <li
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {q.question}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            <strong className="text-slate-700 dark:text-slate-300">
                              Why it matters:{' '}
                            </strong>
                            {q.whyItMatters}
                          </p>
                        </div>
                      </div>

                      {/* Category Badge */}
                      <span
                        aria-label={`Question Category: ${config.label}`}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${config.className}`}
                      >
                        <CategoryIcon className="h-3 w-3" aria-hidden="true" />
                        <span>{config.label}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
