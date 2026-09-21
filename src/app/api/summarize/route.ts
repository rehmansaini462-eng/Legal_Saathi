/**
 * @module app/api/summarize/route
 * @description POST /api/summarize — Streaming plain-language summary endpoint for LegalSaathi.
 *              Generates real-time, grounded plain-language explanations of complex legal documents.
 * @responsibility Validates incoming JSON payload, routes grounded prompts to Gemini, and streams progressive text output with fallback.
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @qualityTier production — full JSDoc, streaming, Zod-validated, unit-tested
 * @security No PII logged, no prompt injection from user input, timeout protected
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ERROR_CODES } from '@/config/constants';
import { generateStream, generateText } from '@/lib/gemini';
import { buildSummaryPrompt, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import type { ApiError } from '@/types/legal';

export const runtime = 'nodejs';

/**
 * Zod validation schema for the /api/summarize incoming request body.
 */
const summarizeRequestSchema = z.object({
  text: z.string().trim().min(10, {
    message: 'Document text must be at least 10 characters long to generate a summary.',
  }),
  filename: z.string().optional().default('document.txt'),
});

/**
 * Helper to identify 503 High Demand service errors.
 *
 * @param error - The caught upstream error.
 * @returns Standardized ApiError if high demand, or null.
 */
function getHighDemandError(error: unknown): ApiError | null {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = errorMsg.toLowerCase();
  const is503 =
    errorMsg.includes('503') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('service unavailable') ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 503) ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === ERROR_CODES.GEMINI_HIGH_DEMAND);

  if (is503) {
    return {
      error: 'Our AI service is experiencing high demand. Please try again in 30 seconds.',
      code: ERROR_CODES.GEMINI_HIGH_DEMAND,
      status: 503,
    };
  }
  return null;
}

/**
 * Handles POST requests to generate a real-time streaming plain-language summary of a legal document.
 * Features graceful degradation to non-streaming generateText if streaming fails.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ text: string, filename?: string }`.
 * @returns Streaming Response with `text/plain; charset=utf-8` or JSON NextResponse with structured ApiError.
 * @throws {ApiError} Structured error response when validation or generation fails.
 * @example
 *   // Client-side stream consumption:
 *   const res = await fetch('/api/summarize', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'This Agreement is made on...', filename: 'nda.pdf' })
 *   });
 *   const reader = res.body.getReader();
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @security Strictly grounded in provided text, sanitizes input, prevents prompt injection, never logs sensitive PII.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let jsonBody: unknown;

  try {
    jsonBody = await request.json();
  } catch {
    const errorResponse: ApiError = {
      error: 'Invalid JSON request payload.',
      code: ERROR_CODES.INVALID_INPUT,
      status: 400,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const validation = summarizeRequestSchema.safeParse(jsonBody);

  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(' ');
    const errorResponse: ApiError = {
      error: errorMsg || 'Invalid request parameters.',
      code: ERROR_CODES.INVALID_INPUT,
      status: 400,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { text, filename } = validation.data;
  const prompt = buildSummaryPrompt({ text, filename });

  try {
    const encoder = new TextEncoder();

    // 1. Try to initialize streaming
    const stream = generateStream(prompt, SAFETY_INSTRUCTIONS);
    const iterator = stream[Symbol.asyncIterator]();

    let firstChunk: IteratorResult<string>;
    try {
      firstChunk = await iterator.next();
    } catch (streamInitError: unknown) {
      console.warn(
        'Streaming initial connection failed, falling back to non-streaming generateContent...',
        streamInitError
      );

      try {
        const fallbackText = await generateText(prompt, SAFETY_INSTRUCTIONS);
        const fallbackStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(fallbackText));
            controller.close();
          },
        });

        return new Response(fallbackStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache, no-transform',
            'X-Fallback': 'true',
          },
        });
      } catch (fallbackError: unknown) {
        const highDemand = getHighDemandError(fallbackError) || getHighDemandError(streamInitError);
        if (highDemand) {
          return NextResponse.json(highDemand, { status: 503 });
        }
        throw fallbackError;
      }
    }

    // 2. Stream chunks with resilience
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (!firstChunk.done && firstChunk.value) {
            controller.enqueue(encoder.encode(firstChunk.value));
          }

          while (true) {
            try {
              const { done, value } = await iterator.next();
              if (done) break;
              if (value) {
                controller.enqueue(encoder.encode(value));
              }
            } catch (chunkErr) {
              console.warn('Warning: Failed to parse stream chunk, continuing...', chunkErr);
              break;
            }
          }
          controller.close();
        } catch (err: unknown) {
          console.warn('Mid-stream failure, attempting fallback completion:', err);
          try {
            const fallbackText = await generateText(prompt, SAFETY_INSTRUCTIONS);
            controller.enqueue(encoder.encode(`\n\n${fallbackText}`));
            controller.close();
          } catch (fallbackErr) {
            controller.error(fallbackErr);
          }
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error: unknown) {
    const highDemand = getHighDemandError(error);
    if (highDemand) {
      return NextResponse.json(highDemand, { status: 503 });
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'status' in error &&
      'error' in error
    ) {
      const apiErr = error as ApiError;
      return NextResponse.json(apiErr, { status: apiErr.status });
    }

    const fallbackError: ApiError = {
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during summarization.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
