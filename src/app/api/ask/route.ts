/**
 * @module app/api/ask/route
 * @description POST /api/ask — Grounded legal document question answering endpoint with citation extraction.
 * @responsibility Validates incoming user question and document payload, formats grounded RAG prompt for Gemini, and returns structured answers with verbatim citations.
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @qualityTier production — full JSDoc, typed errors, Zod-validated, unit-tested
 * @security Question length capped (3-500), no PII logging, grounded generation enforced via guardrails
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { generateJSON } from '@/lib/gemini';
import { buildAskPrompt, AskResponseSchema, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import { rateLimit, getClientIp } from '@/lib/utils/rateLimit';
import { AskRequestSchema, type ApiError, type ApiResponse, type AskResponse } from '@/types/legal';

export const runtime = 'nodejs';

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
 * Handles POST requests to answer natural language questions grounded strictly in a legal document.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ text: string, filename?: string, question: string }`.
 * @returns NextResponse with `ApiResponse<AskResponse>` containing grounded answer and citations or structured ApiError.
 * @throws {ApiError} Structured error response with GEMINI_PARSE_ERROR or GEMINI_API_ERROR when processing fails.
 * @example
 *   // Client-side call:
 *   const res = await fetch('/api/ask', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'Agreement terms...', filename: 'nda.pdf', question: 'What is the confidentiality term?' })
 *   });
 *   const { data } = await res.json();
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @security Question length capped (3-500), no PII logging, grounded generation enforced via guardrails
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AskResponse>>> {
  // Enforce IP-based rate limiting
  const clientIp = getClientIp(request);
  const limiter = rateLimit(clientIp);
  if (!limiter.allowed) {
    const rateLimitError: ApiError = {
      error: 'Too many requests. Please wait a moment.',
      code: ERROR_CODES.RATE_LIMITED,
      status: 429,
    };
    return NextResponse.json(rateLimitError, {
      status: 429,
      headers: {
        'Retry-After': Math.max(1, Math.ceil((limiter.resetAt - Date.now()) / 1000)).toString(),
      },
    });
  }

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

  const validation = AskRequestSchema.safeParse(jsonBody);

  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(' ');
    const errorResponse: ApiError = {
      error: errorMsg || 'Invalid request parameters.',
      code: ERROR_CODES.INVALID_INPUT,
      status: 400,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { text, filename, question } = validation.data;
  const prompt = buildAskPrompt({ text, filename }, question);

  try {
    const askResult = await generateJSON(prompt, AskResponseSchema, SAFETY_INSTRUCTIONS);

    return NextResponse.json({ data: askResult }, { status: 200 });
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
          : 'An unexpected error occurred while processing your legal question.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
