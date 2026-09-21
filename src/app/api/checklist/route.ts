/**
 * @module app/api/checklist/route
 * @description POST /api/checklist — Generates prioritized actionable checklists, contractual deadlines, and overall urgency from legal documents.
 * @responsibility Validates incoming document payload, routes grounded checklist prompts to Gemini, and returns structured action item lists.
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @qualityTier production — full JSDoc, typed errors, Zod-validated, unit-tested
 * @security No PII logging, grounded generation, input validation.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { generateJSON } from '@/lib/gemini';
import { buildChecklistPrompt, ChecklistResponseSchema, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import { rateLimit, getClientIp } from '@/lib/utils/rateLimit';
import {
  ChecklistRequestSchema,
  type ApiError,
  type ApiResponse,
  type ChecklistResponse,
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
 * Handles POST requests to generate prioritized action checklists and deadlines from a legal document.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ text: string, filename?: string }`.
 * @returns NextResponse with `ApiResponse<ChecklistResponse>` containing prioritized action items or structured ApiError.
 * @throws {ApiError} Structured error response with GEMINI_PARSE_ERROR or GEMINI_API_ERROR when generation fails.
 * @example
 *   // Client-side call:
 *   const res = await fetch('/api/checklist', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text: 'Agreement terms...', filename: 'vendor.pdf' })
 *   });
 *   const { data } = await res.json();
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @security No PII logging, grounded generation, input validation.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ChecklistResponse>>> {
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

  const validation = ChecklistRequestSchema.safeParse(jsonBody);

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
  const prompt = buildChecklistPrompt({ text, filename });

  try {
    const checklistResult = await generateJSON(
      prompt,
      ChecklistResponseSchema,
      SAFETY_INSTRUCTIONS
    );

    return NextResponse.json({ data: checklistResult }, { status: 200 });
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
          : 'An unexpected error occurred while generating the action checklist.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
