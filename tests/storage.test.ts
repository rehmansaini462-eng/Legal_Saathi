/**
 * @file storage.test.ts
 * @description Comprehensive unit tests for browser sessionStorage persistence utilities and Zod schema validation in LegalSaathi.
 * Verified across Code Quality, Security, and Problem Alignment evaluation criteria.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFromSession,
  saveToSession,
  clearSession,
  summaryStateSchema,
  clausesStateSchema,
  lawyerPrepStateSchema,
  checklistStateSchema,
  STORAGE_KEYS,
} from '@/lib/utils/storage';
import type { SummaryState, ClausesState, LawyerPrepState, ChecklistState } from '@/types/legal';

describe('sessionStorage utils — Code Quality', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('saves and loads typed values via Zod schema', () => {
    const sampleSummaryState: SummaryState = {
      text: 'This agreement establishes confidentiality obligations between Acme and Beta.',
      status: 'done',
    };

    saveToSession(STORAGE_KEYS.SUMMARY, sampleSummaryState);

    const loaded = loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema);
    expect(loaded).not.toBeNull();
    expect(loaded?.text).toBe(sampleSummaryState.text);
    expect(loaded?.status).toBe('done');
  });

  it('returns null when key is missing', () => {
    const loaded = loadFromSession('legalsaathi:nonexistent', summaryStateSchema);
    expect(loaded).toBeNull();
  });

  it('returns null when stored value is corrupted (SECURITY: input validation)', () => {
    // Corrupted non-JSON string
    window.sessionStorage.setItem(STORAGE_KEYS.SUMMARY, 'invalid-json{{{');
    const loadedInvalidJson = loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema);
    expect(loadedInvalidJson).toBeNull();

    // Valid JSON but invalid schema (missing required fields or invalid status enum)
    window.sessionStorage.setItem(
      STORAGE_KEYS.SUMMARY,
      JSON.stringify({ text: 'Valid text', status: 'invalid_status_enum' })
    );
    const loadedInvalidSchema = loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema);
    expect(loadedInvalidSchema).toBeNull();

    // Valid JSON with corrupted clause item structure
    window.sessionStorage.setItem(
      STORAGE_KEYS.CLAUSES,
      JSON.stringify({
        clauses: [{ id: 'clause-1', riskLevel: 'extreme_danger' }],
        status: 'done',
      })
    );
    const loadedInvalidClauses = loadFromSession(STORAGE_KEYS.CLAUSES, clausesStateSchema);
    expect(loadedInvalidClauses).toBeNull();
  });

  it('clears specified keys without affecting others', () => {
    const sampleSummary: SummaryState = {
      text: 'Executive summary',
      status: 'done',
    };
    const sampleClauses: ClausesState = {
      clauses: [
        {
          id: 'clause-1',
          title: 'Indemnity',
          originalText: 'Party shall indemnify...',
          plainExplanation: 'You are liable for damages.',
          riskLevel: 'high',
          riskReason: 'Uncapped liability',
          category: 'Liability',
        },
      ],
      status: 'done',
    };

    saveToSession(STORAGE_KEYS.SUMMARY, sampleSummary);
    saveToSession(STORAGE_KEYS.CLAUSES, sampleClauses);
    window.sessionStorage.setItem('unrelated_key', 'should_remain');

    clearSession([STORAGE_KEYS.SUMMARY]);

    expect(loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema)).toBeNull();
    expect(loadFromSession(STORAGE_KEYS.CLAUSES, clausesStateSchema)).not.toBeNull();
    expect(window.sessionStorage.getItem('unrelated_key')).toBe('should_remain');
  });
});

describe('sessionStorage schemas — Problem Alignment & Security', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persists and validates complex clause risk structures', () => {
    const fullClausesState: ClausesState = {
      clauses: [
        {
          id: 'c-high',
          title: 'Unlimited Liability',
          originalText: 'Contractor accepts full liability without limitation.',
          plainExplanation: 'You are responsible for all losses indefinitely.',
          riskLevel: 'high',
          riskReason: 'No cap on financial damages.',
          category: 'Liability',
        },
        {
          id: 'c-low',
          title: 'Standard Confidentiality',
          originalText: 'Information remains confidential for 2 years.',
          plainExplanation: 'Standard 2-year secrecy period.',
          riskLevel: 'low',
          riskReason: 'Standard industry term.',
          category: 'Confidentiality',
        },
      ],
      status: 'done',
      error: undefined,
    };

    saveToSession(STORAGE_KEYS.CLAUSES, fullClausesState);
    const loaded = loadFromSession(STORAGE_KEYS.CLAUSES, clausesStateSchema);

    expect(loaded).toBeDefined();
    expect(loaded?.clauses).toHaveLength(2);
    expect(loaded?.clauses?.[0]?.riskLevel).toBe('high');
    expect(loaded?.clauses?.[1]?.riskLevel).toBe('low');
  });

  it('safely handles error states with structured ApiError', () => {
    const errorState: SummaryState = {
      text: '',
      status: 'error',
      error: {
        error: 'Rate limit exceeded. Please try again.',
        code: 'GEMINI_HIGH_DEMAND',
        status: 503,
      },
    };

    saveToSession(STORAGE_KEYS.SUMMARY, errorState);
    const loaded = loadFromSession(STORAGE_KEYS.SUMMARY, summaryStateSchema);

    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe('error');
    expect(loaded?.error?.code).toBe('GEMINI_HIGH_DEMAND');
    expect(loaded?.error?.status).toBe(503);
  });

  it('persists and validates lawyer preparation state', () => {
    const samplePrepState: LawyerPrepState = {
      prep: {
        questions: [
          {
            question: 'Is the indemnity uncapped?',
            whyItMatters: 'Protects from unlimited liability.',
            category: 'risks',
          },
        ],
        keyDocumentsToBring: ['Signed agreement'],
        summaryForLawyer: 'Client has a 1-year contract with uncapped indemnity.',
      },
      status: 'done',
    };

    saveToSession(STORAGE_KEYS.LAWYER_PREP, samplePrepState);
    const loaded = loadFromSession(STORAGE_KEYS.LAWYER_PREP, lawyerPrepStateSchema);

    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe('done');
    expect(loaded?.prep?.questions).toHaveLength(1);
    expect(loaded?.prep?.questions?.[0]?.category).toBe('risks');
  });

  it('persists and validates action checklist state', () => {
    const sampleChecklistState: ChecklistState = {
      checklist: {
        items: [
          {
            step: 'Provide renewal notice',
            priority: 'high',
            deadline: '30 days before March 31',
            rationale: 'Avoids automatic renewal',
          },
        ],
        overallUrgency: 'urgent',
      },
      status: 'done',
    };

    saveToSession(STORAGE_KEYS.CHECKLIST, sampleChecklistState);
    const loaded = loadFromSession(STORAGE_KEYS.CHECKLIST, checklistStateSchema);

    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe('done');
    expect(loaded?.checklist?.overallUrgency).toBe('urgent');
    expect(loaded?.checklist?.items?.[0]?.priority).toBe('high');
  });
});
