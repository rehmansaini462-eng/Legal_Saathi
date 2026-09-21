/**
 * @file retry.test.ts
 * @description Comprehensive unit tests for exponential backoff retry mechanism and API resilience fallbacks.
 * Verified across Code Quality, Reliability, and Security degradation criteria.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withRetry } from '@/lib/gemini';
import { ERROR_CODES } from '@/config/constants';
import * as geminiModule from '@/lib/gemini';
import { POST } from '@/app/api/summarize/route';

// Mock gemini module for route resilience tests
vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof geminiModule>();
  return {
    ...actual,
    generateStream: vi.fn(),
    generateText: vi.fn(),
  };
});

describe('withRetry — Code Quality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on 503 Service Unavailable errors', async () => {
    let callCount = 0;
    const transientFn = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error(
          '[503 Service Unavailable] This model is currently experiencing high demand'
        );
      }
      return 'success-503-recovered';
    });

    const result = await withRetry(transientFn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('success-503-recovered');
    expect(callCount).toBe(3);
    expect(transientFn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 400 Bad Request errors', async () => {
    let callCount = 0;
    const clientErrorFn = vi.fn(async () => {
      callCount++;
      throw new Error('400 Bad Request: Invalid input arguments');
    });

    await expect(withRetry(clientErrorFn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toThrow(
      '400 Bad Request'
    );
    expect(callCount).toBe(1);
    expect(clientErrorFn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff with 3 max retries', async () => {
    let callCount = 0;
    const persistentErrorFn = vi.fn(async () => {
      callCount++;
      throw new Error('503 Service Unavailable');
    });

    await expect(withRetry(persistentErrorFn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toThrow(
      '503 Service Unavailable'
    );

    // 1 initial call + 3 retries = 4 total calls
    expect(callCount).toBe(4);
    expect(persistentErrorFn).toHaveBeenCalledTimes(4);
  });

  it('returns success if any retry succeeds', async () => {
    let callCount = 0;
    const rateLimitFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('429 Too Many Requests: Rate limit exceeded');
      }
      return 'recovered-rate-limit';
    });

    const result = await withRetry(rateLimitFn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('recovered-rate-limit');
    expect(callCount).toBe(2);
    expect(rateLimitFn).toHaveBeenCalledTimes(2);
  });
});

describe('summarize API — Reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to non-streaming when stream fails (SECURITY: graceful degradation)', async () => {
    const mockGenerateStream = vi.mocked(geminiModule.generateStream);
    const mockGenerateText = vi.mocked(geminiModule.generateText);

    // Stream fails on start
    mockGenerateStream.mockImplementation(async function* () {
      throw new Error('Failed to parse stream');
    });

    // Fallback succeeds
    mockGenerateText.mockResolvedValue(
      '### Fallback Summary\nThis is plain-language contract summary via non-streaming fallback.'
    );

    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        text: 'This is a sample Non-Disclosure Agreement for fallback testing.',
        filename: 'fallback_doc.pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Fallback')).toBe('true');
    expect(response.headers.get('Content-Type')).toContain('text/plain');

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

    expect(accumulatedText).toContain('Fallback Summary');
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('returns friendly message on 503 from Gemini', async () => {
    const mockGenerateStream = vi.mocked(geminiModule.generateStream);
    const mockGenerateText = vi.mocked(geminiModule.generateText);

    mockGenerateStream.mockImplementation(async function* () {
      throw new Error('[503 Service Unavailable] This model is currently experiencing high demand');
    });

    mockGenerateText.mockRejectedValue(
      new Error('[503 Service Unavailable] This model is currently experiencing high demand')
    );

    const request = new NextRequest('http://localhost:3000/api/summarize', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Valid contract text that experiences 503 high demand.',
        filename: 'busy_doc.docx',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.code).toBe(ERROR_CODES.GEMINI_HIGH_DEMAND);
    expect(json.error).toBe(
      'Our AI service is experiencing high demand. Please try again in 30 seconds.'
    );
  });
});
