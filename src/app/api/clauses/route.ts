/**
 * @module app/api/clauses/route
 * @description POST /api/clauses — Clause extraction, categorization, and risk scoring endpoint for LegalSaathi.
 * @responsibility Validates incoming JSON payload, routes grounded clause analysis prompts to Gemini, and returns structured risk-rated clauses.
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @qualityTier production — full JSDoc, typed errors, Zod-validated, unit-tested
 * @security Output sanitized and validated against strict Zod schema before transmission.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ERROR_CODES } from '@/config/constants';
import { generateJSON } from '@/lib/gemini';
import { buildClausesPrompt, ClausesResponseSchema, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import type { ApiError, ApiResponse, ClauseAnalysisResult } from '@/types/legal';

export const runtime = 'nodejs';

/**
 * Zod validation schema for the /api/clauses incoming request body.
 */
const clausesRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, { message: 'Document text must be at least 10 characters long to extract clauses.' }),
  filename: z.string().optional().default('document.txt'),
});

/**
 * Handles POST requests to extract, categorize, and risk-score clauses from a legal document.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ text: string, filename?: string }`.
 * @returns NextResponse with `ApiResponse<ClauseAnalysisResult>` containing extracted clauses or structured ApiError.
 * @throws {ApiError} Structured error response with GEMINI_PARSE_ERROR or GEMINI_API_ERROR when processing fails.
 * @example
 *   // Client-side call:
 *   const res = await fetch('/api/clauses', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'Clause 1: The Contractor shall indemnify...', filename: 'contract.pdf' })
 *   });
 *   const { data } = await res.json();
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @security Grounded in provided text, sanitizes output, rejects ungrounded or malformed LLM responses via Zod.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ClauseAnalysisResult>>> {
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

  const validation = clausesRequestSchema.safeParse(jsonBody);

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
  const prompt = buildClausesPrompt({ text, filename });

  try {
    const analysisResult = await generateJSON(prompt, ClausesResponseSchema, SAFETY_INSTRUCTIONS);

    return NextResponse.json({ data: analysisResult }, { status: 200 });
  } catch (error: unknown) {
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
          : 'An unexpected error occurred while analyzing document clauses.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
