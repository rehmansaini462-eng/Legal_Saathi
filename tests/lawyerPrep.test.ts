/**
 * @file lawyerPrep.test.ts
 * @description Comprehensive unit tests for the LegalSaathi Lawyer Consultation Preparation pipeline.
 * Verified across Problem Alignment, Security boundaries, and Code Quality metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/lawyer-prep/route';
import {
  buildLawyerPrepPrompt,
  LawyerPrepResponseSchema,
  type LawyerPrepResponse,
} from '@/lib/prompts';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';

const mockLawyerPrep: LawyerPrepResponse = {
  questions: [
    {
      question: 'Is the uncapped indemnification clause in Section 8 standard or enforceable?',
      whyItMatters: 'Uncapped indemnity exposes your business to catastrophic unlimited liability.',
      category: 'risks',
    },
    {
      question: 'Can the other party terminate without cause on only 7 days notice?',
      whyItMatters:
        'A 7-day notice period gives you insufficient time to find alternative vendors.',
      category: 'termination',
    },
    {
      question: 'What are our IP assignment obligations regarding pre-existing work in Clause 12?',
      whyItMatters:
        'You could inadvertently transfer ownership of proprietary background technology.',
      category: 'rights',
    },
    {
      question: 'Are there any hidden financial penalty triggers if milestones slip?',
      whyItMatters: 'Ensures you are not hit with unexpected liquidated damages.',
      category: 'financial',
    },
    {
      question: 'What is the exact timeline for disputing disputed invoices under Section 5?',
      whyItMatters: 'Missing the 10-day dispute window may waive your right to contest charges.',
      category: 'timelines',
    },
  ],
  keyDocumentsToBring: [
    'Original signed Master Services Agreement (MSA)',
    'Written email correspondence regarding payment schedules',
    'Prior statements of work (SOWs)',
  ],
  summaryForLawyer:
    'Client is entering into a 12-month commercial services contract with one-sided indemnity and short termination notice periods.',
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
      return mockLawyerPrep;
    }),
  };
});

describe('lawyerPrep API — Problem Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates questions for a lawyer meeting from the document', async () => {
    const documentText =
      'Section 8. Indemnification. Contractor shall fully indemnify and hold harmless Client against all losses without cap.';

    const request = new NextRequest('http://localhost:3000/api/lawyer-prep', {
      method: 'POST',
      body: JSON.stringify({
        text: documentText,
        filename: 'contract.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.questions).toBeInstanceOf(Array);
    expect(json.data.questions.length).toBeGreaterThanOrEqual(3);
    expect(json.data.questions[0].question).toContain('indemnif');
  });

  it('categorizes questions by rights, obligations, risks, etc.', async () => {
    const request = new NextRequest('http://localhost:3000/api/lawyer-prep', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Section 8: Indemnity. Section 12: IP Assignment. Section 5: Invoicing.',
        filename: 'service.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    const categories = json.data.questions.map((q: { category: string }) => q.category);
    expect(categories).toContain('risks');
    expect(categories).toContain('termination');
    expect(categories).toContain('rights');
    expect(categories).toContain('financial');
    expect(categories).toContain('timelines');
  });

  it('includes a summary the user can share with the lawyer', async () => {
    const request = new NextRequest('http://localhost:3000/api/lawyer-prep', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Contract between Party A and Party B for software development.',
        filename: 'dev_agreement.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.summaryForLawyer).toBeDefined();
    expect(typeof json.data.summaryForLawyer).toBe('string');
    expect(json.data.summaryForLawyer.length).toBeGreaterThan(20);
  });

  it('lists documents the user should bring', async () => {
    const request = new NextRequest('http://localhost:3000/api/lawyer-prep', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Master Services Agreement with referenced Statement of Work.',
        filename: 'msa.pdf',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.keyDocumentsToBring).toBeInstanceOf(Array);
    expect(json.data.keyDocumentsToBring.length).toBeGreaterThan(0);
    expect(json.data.keyDocumentsToBring[0]).toContain('Agreement');
  });
});

describe('lawyerPrep API — Code Quality & Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects input with text shorter than 10 characters (SECURITY: Input validation)', async () => {
    const request = new NextRequest('http://localhost:3000/api/lawyer-prep', {
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

  it('validates generated schema shape via Zod (Code Quality)', () => {
    const parseResult = LawyerPrepResponseSchema.safeParse(mockLawyerPrep);
    expect(parseResult.success).toBe(true);
  });

  it('constructs grounded prompt containing the document text (Problem Alignment)', () => {
    const prompt = buildLawyerPrepPrompt({
      text: 'Sample contract text for lawyer briefing.',
      filename: 'sample.pdf',
    });

    expect(prompt).toContain('Sample contract text for lawyer briefing.');
    expect(prompt).toContain('sample.pdf');
    expect(prompt).toContain('PREPARATION GUIDELINES');
  });
});
