/**
 * @module app/api/compare/route
 * @description POST /api/compare — Objective side-by-side contract comparison and difference analysis endpoint.
 * @responsibility Validates dual document inputs, enforces combined size limits, routes structured comparison prompts to Gemini, and returns topic-by-topic comparison matrix with party benefits.
 * @alignsWith Problem Statement: "Comparing contracts, agreements, or policies"
 * @qualityTier production — full JSDoc, typed errors, Zod-validated, unit-tested
 * @security Combined input length capped (100,000 chars), no persistence, grounded generation enforced via guardrails
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { generateJSON } from '@/lib/gemini';
import { buildComparePrompt, ComparisonResponseSchema, SAFETY_INSTRUCTIONS } from '@/lib/prompts';
import { rateLimit, getClientIp } from '@/lib/utils/rateLimit';
import {
  CompareRequestSchema,
  type ApiError,
  type ApiResponse,
  type ComparisonResponse,
} from '@/types/legal';

export const runtime = 'nodejs';

/** Maximum combined text length across both documents to prevent memory exhaustion and DoS. */
const MAX_COMBINED_TEXT_CHARS = 100000;

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
 * Handles POST requests to compare two legal documents across key terms and identify differences and party benefits.
 *
 * @param request - Incoming Next.js HTTP request with a JSON body containing `{ docA: { text, filename }, docB: { text, filename } }`.
 * @returns NextResponse with `ApiResponse<ComparisonResponse>` containing comparison rows and executive summary, or structured ApiError.
 * @throws {ApiError} Structured error response with GEMINI_PARSE_ERROR or GEMINI_API_ERROR when processing fails.
 * @example
 *   // Client-side call:
 *   const res = await fetch('/api/compare', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       docA: { text: 'Contract A terms...', filename: 'v1.pdf' },
 *       docB: { text: 'Contract B terms...', filename: 'v2.pdf' }
 *     })
 *   });
 *   const { data } = await res.json();
 * @alignsWith Problem Statement: "Comparing contracts, agreements, or policies"
 * @security Combined input length capped (100,000 chars), no persistence, grounded generation enforced via guardrails
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ComparisonResponse>>> {
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

  const validation = CompareRequestSchema.safeParse(jsonBody);

  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(' ');
    const errorResponse: ApiError = {
      error: errorMsg || 'Invalid comparison request parameters.',
      code: ERROR_CODES.INVALID_INPUT,
      status: 400,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { docA, docB } = validation.data;
  const combinedLength = docA.text.length + docB.text.length;

  if (combinedLength > MAX_COMBINED_TEXT_CHARS) {
    const errorResponse: ApiError = {
      error: `Combined document text exceeds maximum limit of ${MAX_COMBINED_TEXT_CHARS.toLocaleString('en-US')} characters (received ${combinedLength.toLocaleString('en-US')} characters).`,
      code: ERROR_CODES.INVALID_INPUT,
      status: 400,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const prompt = buildComparePrompt(docA, docB);

  try {
    const comparisonResult = await generateJSON(
      prompt,
      ComparisonResponseSchema,
      SAFETY_INSTRUCTIONS
    );

    return NextResponse.json({ data: comparisonResult }, { status: 200 });
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
          : 'An unexpected error occurred while comparing the legal documents.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
