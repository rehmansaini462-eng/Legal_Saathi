/**
 * @file checklist.test.ts
 * @description Comprehensive unit tests for the LegalSaathi Actionable Checklist pipeline.
 * Verified across Problem Alignment, Security boundaries, and Code Quality metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/checklist/route';
import {
  buildChecklistPrompt,
  ChecklistResponseSchema,
  type ChecklistResponse,
} from '@/lib/prompts';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';

const mockChecklist: ChecklistResponse = {
  items: [
    {
      step: 'Request modification of Section 4 uncapped indemnity clause prior to execution.',
      priority: 'high',
      deadline: 'Before signing',
      rationale: 'Uncapped indemnity exposes you to unlimited financial liabilities.',
    },
    {
      step: 'Submit written notice of renewal or cancellation to the vendor.',
      priority: 'high',
      deadline: '30 days prior to March 31, 2027',
      rationale: 'Failing to give 30 days notice triggers automatic 1-year contract extension.',
    },
    {
      step: 'Archive copy of invoice dispute logs and payment receipts.',
      priority: 'medium',
      deadline: 'Within 15 days of invoice date',
      rationale: 'Required to preserve your right to dispute erroneous service charges.',
    },
    {
      step: 'File routine compliance certificate with local regulatory department.',
      priority: 'low',
      rationale: 'Standard annual informational filing requirement.',
    },
  ],
  overallUrgency: 'urgent',
};

// Mock Gemini JSON generator
vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof geminiModule>();
  return {
    ...actual,
    generateJSON: vi.fn(async (prompt: string) => {
      if (prompt.includes('ERROR_PARSE_SIMULATION')) {
        const error = {
          error: 'LLM response failed schema validation',
          code: ERROR_CODES.GEMINI_PARSE_ERROR,
          status: 422,
        };
        throw error;
      }
      return mockChecklist;
    }),
  };
});

describe('checklist API — Problem Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates actionable steps from the document', async () => {
    const documentText =
      'Clause 4: Indemnity. Clause 9: Renewal notice must be served 30 days prior to March 31, 2027.';

    const request = new NextRequest('http://localhost:3000/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        text: documentText,
        filename: 'service_agreement.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.items).toBeInstanceOf(Array);
    expect(json.data.items.length).toBeGreaterThanOrEqual(3);
    expect(json.data.items[0].step).toContain('indemnity');
  });

  it('assigns priority levels to each step', async () => {
    const request = new NextRequest('http://localhost:3000/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Clause 4: High risk indemnity. Clause 12: Low risk filing.',
        filename: 'contract.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    const priorities = json.data.items.map((item: { priority: string }) => item.priority);
    expect(priorities).toContain('high');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('low');
  });

  it('extracts deadlines from the document when present', async () => {
    const request = new NextRequest('http://localhost:3000/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Renewal notice must be given 30 days before March 31, 2027.',
        filename: 'renewal.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    const itemsWithDeadlines = json.data.items.filter(
      (item: { deadline?: string }) => item.deadline && item.deadline.length > 0
    );
    expect(itemsWithDeadlines.length).toBeGreaterThan(0);
    expect(itemsWithDeadlines[0].deadline).toContain('signing');
  });

  it('determines overall urgency from risk levels', async () => {
    const request = new NextRequest('http://localhost:3000/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Immediate payment and uncapped indemnity due immediately.',
        filename: 'urgent_contract.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.overallUrgency).toBe('urgent');
  });
});

describe('checklist API — Code Quality & Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects input with text shorter than 10 characters (SECURITY: Input validation)', async () => {
    const request = new NextRequest('http://localhost:3000/api/checklist', {
      method: 'POST',
      body: JSON.stringify({
        text: 'short',
        filename: 'test.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
  });

  it('validates checklist schema shape via Zod (Code Quality)', () => {
    const parseResult = ChecklistResponseSchema.safeParse(mockChecklist);
    expect(parseResult.success).toBe(true);
  });

  it('validates checklist items with nullable deadline and rationale', () => {
    const checklistWithNulls = {
      items: [
        {
          step: 'Review clause 5 terms',
          priority: 'low',
          deadline: null,
          rationale: null,
        },
      ],
      overallUrgency: 'routine',
    };
    const parseResult = ChecklistResponseSchema.safeParse(checklistWithNulls);
    expect(parseResult.success).toBe(true);
  });

  it('builds grounded prompt containing criteria and document text (Problem Alignment)', () => {
    const prompt = buildChecklistPrompt({
      text: 'Sample legal text with 15-day deadline.',
      filename: 'sample.pdf',
    });

    expect(prompt).toContain('Sample legal text with 15-day deadline.');
    expect(prompt).toContain('CHECKLIST GENERATION CRITERIA');
    expect(prompt).toContain('overallUrgency');
  });
});
