/**
 * @file summarize.test.ts
 * @description Comprehensive unit tests for the LegalSaathi AI Summarization pipeline and endpoint.
 * Verified across Security boundaries, Problem Alignment, and Code Quality metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/summarize/route';
import { buildSummaryPrompt, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';

// Mock Gemini generator
vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof geminiModule>();
  return {
    ...actual,
    generateStream: vi.fn(async function* (prompt: string) {
      if (prompt.includes('ERROR_TRIGGER')) {
        throw new Error('Gemini upstream simulation failure');
      }
      yield '### Document Purpose & Type\n';
      yield 'This Non-Disclosure Agreement protects confidential information.\n\n';
      yield '### Key Rights & Obligations\n';
      yield 'The receiving party must safeguard proprietary data.\n';
    }),
  };
});

describe('summarize API — Problem Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates plain-language summary of complex legal text', async () => {
    const legalContractText =
      'This Non-Disclosure Agreement ("Agreement") is made between Party A and Party B. All proprietary trade secrets disclosed shall be kept strictly confidential for a period of five (5) years.';

    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        text: legalContractText,
        filename: 'nda_agreement.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');

    // Read the stream
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let accumulatedText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value);
      }
    }

    expect(accumulatedText).toContain('Document Purpose & Type');
    expect(accumulatedText).toContain('Key Rights & Obligations');
  });

  it('rejects empty input with clear error', async () => {
    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        text: '',
        filename: 'empty.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(json.error).toContain('Document text must be at least 10 characters long');
  });
});

describe('summarize API — Security', () => {
  it('rejects input with less than minimum character threshold (SECURITY: validation)', async () => {
    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Short',
        filename: 'short.txt',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
  });

  it('rejects malformed non-JSON payloads safely without crash (SECURITY: error handling)', async () => {
    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: 'invalid-json-string',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(json.error).toBe('Invalid JSON request payload.');
  });

  it('enforces safety guardrail instructions in prompt design', () => {
    expect(SAFETY_INSTRUCTIONS).toContain('legal information assistant');
    expect(SAFETY_INSTRUCTIONS).toContain('Never give legal advice');
    expect(SAFETY_INSTRUCTIONS).toContain('Never invent laws or clauses');
  });
});

describe('summarize API — Code Quality', () => {
  it('builds structured prompt with all required legal sections', () => {
    const doc = {
      text: 'Clause 1: The parties agree to arbitrate disputes.',
      filename: 'arbitration.docx',
    };

    const prompt = buildSummaryPrompt(doc);
    expect(prompt).toContain('Document: "arbitration.docx"');
    expect(prompt).toContain('Clause 1: The parties agree to arbitrate disputes.');
    expect(prompt).toContain('Document Purpose & Type');
    expect(prompt).toContain('Key Rights & Obligations');
    expect(prompt).toContain('Critical Deadlines & Financial Terms');
    expect(prompt).toContain('Termination & Exit Conditions');
    expect(prompt).toContain('Actionable Takeaways / Next Steps');
    expect(prompt).toContain('STRICT GROUNDING');
  });
});
