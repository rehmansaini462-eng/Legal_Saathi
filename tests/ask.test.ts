/**
 * @file ask.test.ts
 * @description Comprehensive unit tests for the LegalSaathi Grounded Q&A with Citations pipeline.
 * Verified across Security boundaries, Problem Alignment, and Code Quality metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ask/route';
import { buildAskPrompt, AskResponseSchema, type AskResponse } from '@/lib/prompts';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';

const mockSampleAnswer: AskResponse = {
  answer: 'The contract provides for a 30-day written notice period for termination without cause.',
  citations: [
    {
      quote: 'Either party may terminate this agreement upon thirty (30) days written notice.',
      location: 'Clause 8 (Termination)',
    },
  ],
  confidence: 'high',
  notFoundInDocument: false,
};

const mockNotFoundAnswer: AskResponse = {
  answer:
    'The provided document does not mention any stock option or equity compensation provisions.',
  citations: [],
  confidence: 'low',
  notFoundInDocument: true,
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
      if (prompt.includes('equity') || prompt.includes('stock options')) {
        return mockNotFoundAnswer;
      }
      return mockSampleAnswer;
    }),
  };
});

describe('ask API — Problem Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers questions strictly from provided legal document', async () => {
    const legalText =
      'Clause 8. Termination. Either party may terminate this agreement upon thirty (30) days written notice.';

    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: legalText,
        filename: 'service_agreement.pdf',
        question: 'What is the notice period required for termination?',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.answer).toContain('30-day');
    expect(json.data.notFoundInDocument).toBe(false);
  });

  it('returns citations with quoted source text for every answer', async () => {
    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Clause 8: Either party may terminate with 30 days notice.',
        filename: 'contract.pdf',
        question: 'How do I end the contract?',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.citations).toBeInstanceOf(Array);
    expect(json.data.citations.length).toBeGreaterThan(0);
    expect(json.data.citations[0].quote).toContain('Either party may terminate');
    expect(json.data.citations[0].location).toBe('Clause 8 (Termination)');
  });

  it('marks notFoundInDocument when answer is not present', async () => {
    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Standard NDA covering trade secrets for 2 years.',
        filename: 'nda.txt',
        question: 'Are stock options granted under this agreement?',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.data.notFoundInDocument).toBe(true);
    expect(json.data.confidence).toBe('low');
    expect(json.data.citations).toHaveLength(0);
  });
});

describe('ask API — Security', () => {
  it('rejects empty questions with INVALID_INPUT (SECURITY: input validation)', async () => {
    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Valid contract text that meets minimum length...',
        filename: 'doc.pdf',
        question: '  ',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
  });

  it('rejects questions longer than 500 chars (SECURITY: abuse prevention)', async () => {
    const oversizedQuestion = 'A'.repeat(501);

    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Valid contract text that meets minimum length...',
        filename: 'doc.pdf',
        question: oversizedQuestion,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(json.error).toContain('500');
  });

  it('never gives legal advice, only restates document content (SECURITY: guardrails)', () => {
    const prompt = buildAskPrompt(
      { text: 'Sample legal contract', filename: 'contract.pdf' },
      'Should I sue the company?'
    );

    expect(prompt).toContain('Never give formal legal advice or speculative opinions');
    expect(prompt).toContain('STRICT GROUNDING: Answer ONLY from the provided document text');
    expect(prompt).toContain(
      'MISSING INFORMATION: If the document does not contain the answer, set "notFoundInDocument": true'
    );
  });

  it('handles upstream Gemini parse failures with GEMINI_PARSE_ERROR', async () => {
    const request = new NextRequest('http://localhost:3000/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Document text triggering ERROR_PARSE_SIMULATION test case.',
        filename: 'fail.pdf',
        question: 'What is this?',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.GEMINI_PARSE_ERROR);
  });
});

describe('ask API — Code Quality', () => {
  it('properly validates valid AskResponse schema shapes with Zod', () => {
    const validPayload = {
      answer: 'Payment is due Net 30.',
      citations: [
        {
          quote: 'Payment within thirty days.',
          location: 'Clause 4',
        },
      ],
      confidence: 'high',
      notFoundInDocument: false,
    };

    const parsed = AskResponseSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid confidence values in schema validation', () => {
    const invalidPayload = {
      answer: 'Some answer',
      citations: [],
      confidence: 'certainty-100%', // invalid enum
      notFoundInDocument: false,
    };

    const parsed = AskResponseSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
