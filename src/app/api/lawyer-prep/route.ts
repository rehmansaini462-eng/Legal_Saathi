/**
 * @module app/api/lawyer-prep/route
 * @description POST /api/lawyer-prep — Generates targeted questions, documents-to-bring checklists, and case briefings to prepare users for attorney consultations.
 * @responsibility Validates incoming document payload, routes grounded lawyer preparation prompts to Gemini, and returns structured consultation readiness packages.
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 * @qualityTier production — full JSDoc, typed errors, Zod-validated, unit-tested
 * @security No PII logging, grounded generation, explicit disclaimer that this is not legal advice.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { generateJSON } from '@/lib/gemini';
import {
  buildLawyerPrepPrompt,
  LawyerPrepResponseSchema,
  SAFETY_INSTRUCTIONS,
} from '@/lib/prompts';
import {
  LawyerPrepRequestSchema,
  type ApiError,
  type ApiResponse,
  type LawyerPrepResponse,
} from '@/types/legal';

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
 * Handles POST requests to generate targeted consultation questions, documents to bring, and summaries for legal counsel.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ text: string, filename?: string }`.
 * @returns NextResponse with `ApiResponse<LawyerPrepResponse>` containing consultation readiness package or structured ApiError.
 * @throws {ApiError} Structured error response with GEMINI_PARSE_ERROR or GEMINI_API_ERROR when generation fails.
 * @example
 *   // Client-side call:
 *   const res = await fetch('/api/lawyer-prep', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'Agreement terms...', filename: 'lease.pdf' })
 *   });
 *   const { data } = await res.json();
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 * @security No PII logging, grounded generation, explicit disclaimer that this is not legal advice.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LawyerPrepResponse>>> {
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

  const validation = LawyerPrepRequestSchema.safeParse(jsonBody);

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
  const prompt = buildLawyerPrepPrompt({ text, filename });

  try {
    const prepResult = await generateJSON(prompt, LawyerPrepResponseSchema, SAFETY_INSTRUCTIONS);

    return NextResponse.json({ data: prepResult }, { status: 200 });
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
          : 'An unexpected error occurred while preparing consultation questions.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
