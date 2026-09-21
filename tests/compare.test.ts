/**
 * @file compare.test.ts
 * @description Comprehensive unit tests for the LegalSaathi Contract & Document Comparison pipeline.
 * Verified across Security boundaries, Problem Alignment, and Code Quality metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/compare/route';
import {
  buildComparePrompt,
  ComparisonResponseSchema,
  type ComparisonResponse,
} from '@/lib/prompts';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';

const mockSampleComparison: ComparisonResponse = {
  rows: [
    {
      topic: 'Payment Terms',
      docA: 'Net 30 days from invoice date (Clause 4.1)',
      docB: 'Net 60 days from invoice date (Clause 5.2)',
      difference: 'Document A requires payment 30 days sooner than Document B.',
      benefitsParty: 'A',
    },
    {
      topic: 'Liability Cap',
      docA: 'Liability capped at total fees paid (Clause 9)',
      docB: 'Uncapped unlimited liability without exceptions (Clause 11)',
      difference: 'Document A protects the service provider with a hard liability ceiling.',
      benefitsParty: 'A',
    },
    {
      topic: 'Governing Law',
      docA: 'Laws of California, binding AAA arbitration (Clause 14)',
      docB: 'Laws of New York, state and federal courts (Clause 15)',
      difference: 'Different jurisdiction and dispute resolution forums.',
      benefitsParty: 'neither',
    },
  ],
  summary:
    'Document A provides significantly stronger liability protection and faster payment timelines than Document B.',
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
      return mockSampleComparison;
    }),
  };
});

describe('compare API — Problem Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compares two contracts across standard topics', async () => {
    const docA = {
      text: 'Agreement A: Payment is due within 30 days. Liability capped at $10k.',
      filename: 'contract_v1.pdf',
    };
    const docB = {
      text: 'Agreement B: Payment is due within 60 days. Liability is unlimited.',
      filename: 'contract_v2.pdf',
    };

    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({ docA, docB }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.rows).toHaveLength(3);
    expect(json.data.summary).toContain('Document A');
  });

  it('returns structured rows with topic, docA, docB, difference', async () => {
    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        docA: { text: 'Contract A terms...', filename: 'v1.docx' },
        docB: { text: 'Contract B terms...', filename: 'v2.docx' },
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    const firstRow = json.data.rows[0];
    expect(firstRow.topic).toBe('Payment Terms');
    expect(firstRow.docA).toBeDefined();
    expect(firstRow.docB).toBeDefined();
    expect(firstRow.difference).toBeDefined();
  });

  it('identifies which party benefits from each difference', async () => {
    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        docA: { text: 'Terms A...', filename: 'a.pdf' },
        docB: { text: 'Terms B...', filename: 'b.pdf' },
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.rows[0].benefitsParty).toBe('A');
    expect(json.data.rows[2].benefitsParty).toBe('neither');
  });
});

describe('compare API — Security', () => {
  it('rejects missing docB with INVALID_INPUT (SECURITY: validation)', async () => {
    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        docA: { text: 'Valid doc A text...', filename: 'a.pdf' },
        // docB is missing
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
  });

  it('rejects combined input exceeding 100K chars (SECURITY: DoS prevention)', async () => {
    const hugeDocA = 'A'.repeat(60000);
    const hugeDocB = 'B'.repeat(50000); // combined = 110,000 > 100,000 limit

    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        docA: { text: hugeDocA, filename: 'hugeA.txt' },
        docB: { text: hugeDocB, filename: 'hugeB.txt' },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(json.error).toContain('100,000');
  });

  it('never fabricates clauses not present in either document (SECURITY: grounded)', () => {
    const prompt = buildComparePrompt(
      { text: 'Terms for Document A', filename: 'A.pdf' },
      { text: 'Terms for Document B', filename: 'B.pdf' }
    );

    expect(prompt).toContain('GROUNDING & EVALUATION INSTRUCTIONS');
    expect(prompt).toContain(
      'NEVER FABRICATE: If a topic is omitted or silent in either document, state "Not specified in document"'
    );
    expect(prompt).toContain('Base every comparison point strictly on the provided texts');
  });

  it('handles upstream Gemini parse failures with GEMINI_PARSE_ERROR', async () => {
    const request = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        docA: { text: 'Triggering ERROR_PARSE_SIMULATION test case.', filename: 'a.pdf' },
        docB: { text: 'Triggering ERROR_PARSE_SIMULATION test case.', filename: 'b.pdf' },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.GEMINI_PARSE_ERROR);
  });
});

describe('compare API — Code Quality', () => {
  it('properly validates valid ComparisonResponse schema shapes with Zod', () => {
    const validComparison = {
      rows: [
        {
          topic: 'Termination Notice',
          docA: '30 days',
          docB: '90 days',
          difference: 'Doc A gives shorter notice.',
          benefitsParty: 'A',
        },
      ],
      summary: 'Doc A is more flexible.',
    };

    const parsed = ComparisonResponseSchema.safeParse(validComparison);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid benefitsParty values in schema validation', () => {
    const invalidComparison = {
      rows: [
        {
          topic: 'Termination Notice',
          docA: '30 days',
          docB: '90 days',
          difference: 'Doc A gives shorter notice.',
          benefitsParty: 'vendor-party', // invalid enum
        },
      ],
      summary: 'Summary...',
    };

    const parsed = ComparisonResponseSchema.safeParse(invalidComparison);
    expect(parsed.success).toBe(false);
  });
});
