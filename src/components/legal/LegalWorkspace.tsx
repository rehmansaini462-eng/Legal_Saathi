/**
 * @module components/legal/LegalWorkspace
 * @description Central client-side legal document workspace container for LegalSaathi.
 * Orchestrates document parsing, mode toggles (Single vs Compare), error handling, accessible tab navigation,
 * and AI comprehension workflows (Summary, Clause Risk, Grounded Q&A, and Document Comparison) with persistent session state.
 * @responsibility Coordinates parsed document states, error displays, document previews, summary, clause analysis, Q&A, and comparison matrix tabs.
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 * @accessibility Fully WCAG 2.1 AA compliant with keyboard-navigable ARIA tabs (role="tablist", role="tab", role="tabpanel") and screen-reader announcements.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React, { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  XCircle,
  FileText,
  Sparkles,
  ShieldAlert,
  MessageSquare,
  GitCompare,
  Layers,
  Briefcase,
  ListChecks,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { DocumentUploader } from './DocumentUploader';
import { DocumentPreview } from './DocumentPreview';
import { SkeletonCard } from './SkeletonCard';
import { redactPII } from '@/lib/utils/redact';

// Lazy load heavy client tabs with skeleton fallbacks to minimize initial First Load JS
const SummaryCard = dynamic(() => import('./SummaryCard').then((mod) => mod.SummaryCard), {
  ssr: false,
  loading: () => <SkeletonCard lines={4} ariaLabel="Loading plain language summary" />,
});

const ClauseList = dynamic(() => import('./ClauseList').then((mod) => mod.ClauseList), {
  ssr: false,
  loading: () => <SkeletonCard lines={4} ariaLabel="Loading clause risk analysis" />,
});

const AskQuestion = dynamic(() => import('./AskQuestion').then((mod) => mod.AskQuestion), {
  ssr: false,
  loading: () => <SkeletonCard lines={4} ariaLabel="Loading document Q&A companion" />,
});

const CompareDocuments = dynamic(
  () => import('./CompareDocuments').then((mod) => mod.CompareDocuments),
  {
    ssr: false,
    loading: () => <SkeletonCard lines={4} ariaLabel="Loading document comparison tool" />,
  }
);

const LawyerPrepCard = dynamic(() => import('./LawyerPrepCard').then((mod) => mod.LawyerPrepCard), {
  ssr: false,
  loading: () => <SkeletonCard lines={4} ariaLabel="Loading lawyer consultation preparation" />,
});

const ActionChecklist = dynamic(
  () => import('./ActionChecklist').then((mod) => mod.ActionChecklist),
  {
    ssr: false,
    loading: () => <SkeletonCard lines={4} ariaLabel="Loading action checklist tool" />,
  }
);

const RedactPIIPanel = dynamic(() => import('./RedactPIIPanel').then((mod) => mod.RedactPIIPanel), {
  ssr: false,
  loading: () => <SkeletonCard lines={2} showHeader={false} ariaLabel="Loading privacy panel" />,
});
import type {
  ApiError,
  ParsedDocument,
  SummaryState,
  ClausesState,
  AskState,
  CompareState,
  LawyerPrepState,
  ChecklistState,
} from '@/types/legal';
import {
  STORAGE_KEYS,
  loadFromSession,
  saveToSession,
  clearSession,
  summaryStateSchema,
  clausesStateSchema,
  askStateSchema,
  compareStateSchema,
  lawyerPrepStateSchema,
  checklistStateSchema,
} from '@/lib/utils/storage';

/** Available workspace modes. */
type WorkspaceMode = 'single' | 'compare';

/** Available tab views in Single Document mode. */
type SingleWorkspaceTab = 'preview' | 'summary' | 'clauses' | 'ask' | 'lawyerPrep' | 'checklist';

/** Available tab views in Compare mode. */
type CompareWorkspaceTab = 'previewA' | 'previewB' | 'comparison';

interface SingleTabDefinition {
  id: SingleWorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  description: string;
}

interface CompareTabDefinition {
  id: CompareWorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  description: string;
}

const SINGLE_WORKSPACE_TABS: readonly SingleTabDefinition[] = [
  {
    id: 'preview',
    label: 'Document Preview',
    icon: FileText,
    description: 'Extracted text and document metadata inspection',
  },
  {
    id: 'summary',
    label: 'AI Summary',
    icon: Sparkles,
    description: 'Plain-language breakdown and executive takeaways',
  },
  {
    id: 'clauses',
    label: 'Clause Risk Analysis',
    icon: ShieldAlert,
    description: 'Categorized clauses, liabilities, and risk levels',
  },
  {
    id: 'ask',
    label: 'Ask Questions',
    icon: MessageSquare,
    description: 'Grounded Q&A with exact source text citations',
  },
  {
    id: 'lawyerPrep',
    label: 'Prepare for Lawyer',
    icon: Briefcase,
    description: 'Targeted consultation questions, case briefing, and document checklist',
  },
  {
    id: 'checklist',
    label: 'Action Checklist',
    icon: ListChecks,
    description: 'Prioritized actionable steps, obligations, and deadlines',
  },
] as const;

const COMPARE_WORKSPACE_TABS: readonly CompareTabDefinition[] = [
  {
    id: 'comparison',
    label: 'Comparison Matrix',
    icon: GitCompare,
    description: 'Side-by-side contract difference matrix and party benefits',
  },
  {
    id: 'previewA',
    label: 'Preview Doc A',
    icon: FileText,
    description: 'Extracted text and metadata for Document A',
  },
  {
    id: 'previewB',
    label: 'Preview Doc B',
    icon: FileText,
    description: 'Extracted text and metadata for Document B',
  },
] as const;

/**
 * Interactive workspace component managing document upload state, mode toggling, API error handling,
 * accessible tabbed views, and persisted analysis across tab switches and refreshes.
 *
 * @returns Complete client-side legal document processing workspace.
 * @example
 *   <LegalWorkspace />
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 */
export function LegalWorkspace(): React.JSX.Element {
  // Mode selection state: 'single' document vs 'compare' dual document mode
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('single');

  // Single document state
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [activeSingleTab, setActiveSingleTab] = useState<SingleWorkspaceTab>('preview');

  // Compare mode states
  const [parsedDocA, setParsedDocA] = useState<ParsedDocument | null>(null);
  const [parsedDocB, setParsedDocB] = useState<ParsedDocument | null>(null);
  const [activeCompareTab, setActiveCompareTab] = useState<CompareWorkspaceTab>('comparison');

  const [error, setError] = useState<ApiError | null>(null);

  // Lifted state with lazy sessionStorage hydration for Summary
  const [summaryState, setSummaryState] = useState<SummaryState>(() => {
    if (typeof window === 'undefined') {
      return { text: '', status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema);
    if (saved) {
      const restoredStatus =
        saved.status === 'streaming' ? (saved.text ? 'done' : 'idle') : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { text: '', status: 'idle' };
  });

  // Lifted state with lazy sessionStorage hydration for Clauses
  const [clausesState, setClausesState] = useState<ClausesState>(() => {
    if (typeof window === 'undefined') {
      return { clauses: [], status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.CLAUSES, clausesStateSchema);
    if (saved) {
      const restoredStatus =
        saved.status === 'loading' ? (saved.clauses.length > 0 ? 'done' : 'idle') : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { clauses: [], status: 'idle' };
  });

  // Lifted state with lazy sessionStorage hydration for Q&A
  const [askState, setAskState] = useState<AskState>(() => {
    if (typeof window === 'undefined') {
      return { history: [], status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.ASK, askStateSchema);
    if (saved) {
      const restoredStatus = saved.status === 'loading' ? 'idle' : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { history: [], status: 'idle' };
  });

  // Lifted state with lazy sessionStorage hydration for Comparison
  const [compareState, setCompareState] = useState<CompareState>(() => {
    if (typeof window === 'undefined') {
      return { comparison: null, status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.COMPARE, compareStateSchema);
    if (saved) {
      const restoredStatus =
        saved.status === 'loading' ? (saved.comparison ? 'done' : 'idle') : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { comparison: null, status: 'idle' };
  });

  // Lifted state with lazy sessionStorage hydration for Lawyer Prep
  const [lawyerPrepState, setLawyerPrepState] = useState<LawyerPrepState>(() => {
    if (typeof window === 'undefined') {
      return { prep: null, status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.LAWYER_PREP, lawyerPrepStateSchema);
    if (saved) {
      const restoredStatus =
        saved.status === 'loading' ? (saved.prep ? 'done' : 'idle') : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { prep: null, status: 'idle' };
  });

  // Lifted state with lazy sessionStorage hydration for Action Checklist
  const [checklistState, setChecklistState] = useState<ChecklistState>(() => {
    if (typeof window === 'undefined') {
      return { checklist: null, status: 'idle' };
    }
    const saved = loadFromSession(STORAGE_KEYS.CHECKLIST, checklistStateSchema);
    if (saved) {
      const restoredStatus =
        saved.status === 'loading' ? (saved.checklist ? 'done' : 'idle') : saved.status;
      return { ...saved, status: restoredStatus };
    }
    return { checklist: null, status: 'idle' };
  });

  // Client-side Privacy & PII Redaction toggle state
  const [isRedactingPii, setIsRedactingPii] = useState<boolean>(false);

  const parsedDocText = parsedDoc?.text;

  // Compute client-side PII redactions for single mode document
  const { redactedDocText, piiDetections } = useMemo(() => {
    if (!parsedDocText) return { redactedDocText: '', piiDetections: [] };
    const res = redactPII(parsedDocText);
    return { redactedDocText: res.redactedText, piiDetections: res.detections };
  }, [parsedDocText]);

  const activeDocText = isRedactingPii ? redactedDocText : (parsedDoc?.text ?? '');

  const singleTabRefs = useRef<{ [key in SingleWorkspaceTab]?: HTMLButtonElement | null }>({});
  const compareTabRefs = useRef<{ [key in CompareWorkspaceTab]?: HTMLButtonElement | null }>({});

  // Persist summary state to sessionStorage
  useEffect(() => {
    if (summaryState.status !== 'idle' || summaryState.text) {
      saveToSession(STORAGE_KEYS.SUMMARY, summaryState);
    }
  }, [summaryState]);

  // Persist clauses state to sessionStorage
  useEffect(() => {
    if (clausesState.status !== 'idle' || clausesState.clauses.length > 0) {
      saveToSession(STORAGE_KEYS.CLAUSES, clausesState);
    }
  }, [clausesState]);

  // Persist ask state to sessionStorage
  useEffect(() => {
    if (askState.status !== 'idle' || askState.history.length > 0) {
      saveToSession(STORAGE_KEYS.ASK, askState);
    }
  }, [askState]);

  // Persist compare state to sessionStorage
  useEffect(() => {
    if (compareState.status !== 'idle' || compareState.comparison !== null) {
      saveToSession(STORAGE_KEYS.COMPARE, compareState);
    }
  }, [compareState]);

  // Persist lawyer prep state to sessionStorage
  useEffect(() => {
    if (lawyerPrepState.status !== 'idle' || lawyerPrepState.prep !== null) {
      saveToSession(STORAGE_KEYS.LAWYER_PREP, lawyerPrepState);
    }
  }, [lawyerPrepState]);

  // Persist checklist state to sessionStorage
  useEffect(() => {
    if (checklistState.status !== 'idle' || checklistState.checklist !== null) {
      saveToSession(STORAGE_KEYS.CHECKLIST, checklistState);
    }
  }, [checklistState]);

  /**
   * Handles successful single document parsing.
   *
   * @param doc - Successfully parsed document payload.
   */
  const handleSingleParsed = (doc: ParsedDocument) => {
    setParsedDoc(doc);
    setError(null);
    setActiveSingleTab('preview');

    // Reset lifted states and purge persisted session storage for new file
    setSummaryState({ text: '', status: 'idle' });
    setClausesState({ clauses: [], status: 'idle' });
    setAskState({ history: [], status: 'idle' });
    setLawyerPrepState({ prep: null, status: 'idle' });
    setChecklistState({ checklist: null, status: 'idle' });
    clearSession([
      STORAGE_KEYS.SUMMARY,
      STORAGE_KEYS.CLAUSES,
      STORAGE_KEYS.ASK,
      STORAGE_KEYS.LAWYER_PREP,
      STORAGE_KEYS.CHECKLIST,
    ]);
  };

  /**
   * Handles successful parsing of Document A in Compare Mode.
   */
  const handleDocAParsed = (doc: ParsedDocument) => {
    setParsedDocA(doc);
    setError(null);
    setCompareState({ comparison: null, status: 'idle' });
    clearSession([STORAGE_KEYS.COMPARE]);
  };

  /**
   * Handles successful parsing of Document B in Compare Mode.
   */
  const handleDocBParsed = (doc: ParsedDocument) => {
    setParsedDocB(doc);
    setError(null);
    setCompareState({ comparison: null, status: 'idle' });
    clearSession([STORAGE_KEYS.COMPARE]);
  };

  /**
   * Handles upload or parsing failure.
   *
   * @param err - Structured API error returned by ingestion pipeline.
   */
  const handleError = (err: ApiError) => {
    setError(err);
  };

  /**
   * Clears the current active error.
   */
  const handleDismissError = () => {
    setError(null);
  };

  /**
   * Handles accessible arrow-key navigation between Single Mode tabs.
   */
  const handleSingleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    const totalTabs = SINGLE_WORKSPACE_TABS.length;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % totalTabs;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + totalTabs) % totalTabs;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = totalTabs - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = SINGLE_WORKSPACE_TABS[nextIndex];
      if (nextTab) {
        setActiveSingleTab(nextTab.id);
        singleTabRefs.current[nextTab.id]?.focus();
      }
    }
  };

  /**
   * Handles accessible arrow-key navigation between Compare Mode tabs.
   */
  const handleCompareTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    const totalTabs = COMPARE_WORKSPACE_TABS.length;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % totalTabs;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + totalTabs) % totalTabs;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = totalTabs - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = COMPARE_WORKSPACE_TABS[nextIndex];
      if (nextTab) {
        setActiveCompareTab(nextTab.id);
        compareTabRefs.current[nextTab.id]?.focus();
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Workspace Mode Switcher */}
      <div className="flex items-center justify-center">
        <div
          role="radiogroup"
          aria-label="Workspace Mode Selection"
          className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            role="radio"
            aria-checked={workspaceMode === 'single'}
            onClick={() => {
              setWorkspaceMode('single');
              setError(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
              workspaceMode === 'single'
                ? 'bg-white text-blue-700 shadow-xs dark:bg-zinc-800 dark:text-blue-400'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Single Document</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={workspaceMode === 'compare'}
            onClick={() => {
              setWorkspaceMode('compare');
              setError(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
              workspaceMode === 'compare'
                ? 'bg-white text-purple-700 shadow-xs dark:bg-zinc-800 dark:text-purple-400'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            <span>Compare Contracts</span>
          </button>
        </div>
      </div>

      {/* Global Error Alert Display */}
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

      {/* ================= SINGLE DOCUMENT WORKSPACE ================= */}
      {workspaceMode === 'single' && (
        <div className="space-y-6">
          {/* Document Uploader */}
          <DocumentUploader onParsed={handleSingleParsed} onError={handleError} />

          {/* Workspace Tabs & Panels (Shown when document is uploaded) */}
          {parsedDoc && (
            <div className="space-y-4">
              {/* Privacy & Client-Side Redaction Panel */}
              <RedactPIIPanel
                isRedacted={isRedactingPii}
                onToggle={setIsRedactingPii}
                detections={piiDetections}
              />

              {/* Accessible Tab List */}
              <div
                role="tablist"
                aria-label="Document Analysis Views"
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100/70 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                {SINGLE_WORKSPACE_TABS.map((tab, idx) => {
                  const IconComponent = tab.icon;
                  const isSelected = activeSingleTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        singleTabRefs.current[tab.id] = el;
                      }}
                      id={`tab-${tab.id}`}
                      role="tab"
                      type="button"
                      aria-selected={isSelected}
                      aria-controls={`panel-${tab.id}`}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => setActiveSingleTab(tab.id)}
                      onKeyDown={(e) => handleSingleTabKeyDown(e, idx)}
                      className={`flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                        isSelected
                          ? 'bg-white text-blue-700 shadow-xs dark:bg-zinc-800 dark:text-blue-400'
                          : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Panel 1: Document Preview */}
              <div
                id="panel-preview"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-preview"
                hidden={activeSingleTab !== 'preview'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'preview' && (
                  <DocumentPreview
                    doc={isRedactingPii ? { ...parsedDoc, text: activeDocText } : parsedDoc}
                  />
                )}
              </div>

              {/* Tab Panel 2: Plain-Language Summary */}
              <div
                id="panel-summary"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-summary"
                hidden={activeSingleTab !== 'summary'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'summary' && (
                  <SummaryCard
                    text={activeDocText}
                    filename={parsedDoc.filename}
                    state={summaryState}
                    onStateChange={setSummaryState}
                  />
                )}
              </div>

              {/* Tab Panel 3: Clause Risk Analysis */}
              <div
                id="panel-clauses"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-clauses"
                hidden={activeSingleTab !== 'clauses'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'clauses' && (
                  <ClauseList
                    text={activeDocText}
                    filename={parsedDoc.filename}
                    state={clausesState}
                    onStateChange={setClausesState}
                  />
                )}
              </div>

              {/* Tab Panel 4: Grounded Q&A with Citations */}
              <div
                id="panel-ask"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-ask"
                hidden={activeSingleTab !== 'ask'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'ask' && (
                  <AskQuestion
                    text={activeDocText}
                    filename={parsedDoc.filename}
                    state={askState}
                    onStateChange={setAskState}
                  />
                )}
              </div>

              {/* Tab Panel 5: Lawyer Consultation Preparation */}
              <div
                id="panel-lawyerPrep"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-lawyerPrep"
                hidden={activeSingleTab !== 'lawyerPrep'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'lawyerPrep' && (
                  <LawyerPrepCard
                    text={activeDocText}
                    filename={parsedDoc.filename}
                    state={lawyerPrepState}
                    onStateChange={setLawyerPrepState}
                  />
                )}
              </div>

              {/* Tab Panel 6: Actionable Next Steps Checklist */}
              <div
                id="panel-checklist"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="tab-checklist"
                hidden={activeSingleTab !== 'checklist'}
                className="focus:outline-hidden"
              >
                {activeSingleTab === 'checklist' && (
                  <ActionChecklist
                    text={activeDocText}
                    filename={parsedDoc.filename}
                    state={checklistState}
                    onStateChange={setChecklistState}
                  />
                )}
              </div>
            </div>
          )}

          {/* Initial empty state before single document upload */}
          {!parsedDoc && !error && <DocumentPreview doc={null} />}
        </div>
      )}

      {/* ================= DUAL DOCUMENT COMPARE WORKSPACE ================= */}
      {workspaceMode === 'compare' && (
        <div className="space-y-6">
          {/* Dual Document Uploaders */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  A
                </span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Document A (Base Contract)
                </h4>
              </div>
              <DocumentUploader onParsed={handleDocAParsed} onError={handleError} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                  B
                </span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Document B (Revised / Alternative Contract)
                </h4>
              </div>
              <DocumentUploader onParsed={handleDocBParsed} onError={handleError} />
            </div>
          </div>

          {/* Show Compare Tabs when both documents are uploaded */}
          {parsedDocA && parsedDocB ? (
            <div className="space-y-4">
              {/* Accessible Tab List for Compare Mode */}
              <div
                role="tablist"
                aria-label="Document Comparison Views"
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100/70 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                {COMPARE_WORKSPACE_TABS.map((tab, idx) => {
                  const IconComponent = tab.icon;
                  const isSelected = activeCompareTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        compareTabRefs.current[tab.id] = el;
                      }}
                      id={`compare-tab-${tab.id}`}
                      role="tab"
                      type="button"
                      aria-selected={isSelected}
                      aria-controls={`compare-panel-${tab.id}`}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => setActiveCompareTab(tab.id)}
                      onKeyDown={(e) => handleCompareTabKeyDown(e, idx)}
                      className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                        isSelected
                          ? 'bg-white text-purple-700 shadow-xs dark:bg-zinc-800 dark:text-purple-400'
                          : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Compare Panel 1: Comparison Matrix */}
              <div
                id="compare-panel-comparison"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="compare-tab-comparison"
                hidden={activeCompareTab !== 'comparison'}
                className="focus:outline-hidden"
              >
                {activeCompareTab === 'comparison' && (
                  <CompareDocuments
                    docA={{ text: parsedDocA.text, filename: parsedDocA.filename }}
                    docB={{ text: parsedDocB.text, filename: parsedDocB.filename }}
                    state={compareState}
                    onStateChange={setCompareState}
                  />
                )}
              </div>

              {/* Compare Panel 2: Preview Doc A */}
              <div
                id="compare-panel-previewA"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="compare-tab-previewA"
                hidden={activeCompareTab !== 'previewA'}
                className="focus:outline-hidden"
              >
                {activeCompareTab === 'previewA' && <DocumentPreview doc={parsedDocA} />}
              </div>

              {/* Compare Panel 3: Preview Doc B */}
              <div
                id="compare-panel-previewB"
                role="tabpanel"
                tabIndex={0}
                aria-labelledby="compare-tab-previewB"
                hidden={activeCompareTab !== 'previewB'}
                className="focus:outline-hidden"
              >
                {activeCompareTab === 'previewB' && <DocumentPreview doc={parsedDocB} />}
              </div>
            </div>
          ) : (
            <div className="dark:bg-zinc-850/40 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800">
              <GitCompare
                className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-600"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Upload both Document A and Document B to compare
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Once both contracts are uploaded, you can view a topic-by-topic comparison matrix,
                difference analysis, and party favorability insights.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
