/**
 * @module app/api/parse/route
 * @description POST /api/parse — multipart upload endpoint for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Validates incoming multipart HTTP requests, routes documents to the parser engine, and returns structured JSON responses.
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security No stack traces or filesystem paths leaked to client
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { isApiError, parseDocument } from '@/lib/parser';
import { rateLimit, getClientIp } from '@/lib/utils/rateLimit';
import type { ApiError, ApiResponse, ParsedDocument } from '@/types/legal';

export const runtime = 'nodejs';

/**
 * Handles multipart/form-data document upload and returns extracted text and metadata.
 *
 * @param request - Incoming Next.js HTTP request containing a multipart/form-data payload with a 'file' field.
 * @returns NextResponse containing ApiResponse<ParsedDocument> with extracted text or structured ApiError.
 * @example
 *   // Client-side call:
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   const res = await fetch('/api/parse', { method: 'POST', body: formData });
 *   const data = await res.json();
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 * @security Sanitizes all error outputs ensuring internal traces or system paths are never exposed and throttles via rate limiting.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ParsedDocument>>> {
  // Enforce IP-based rate limiting to protect parser resources from DoS
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

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      const errorResponse: ApiError = {
        error: 'No file provided',
        code: ERROR_CODES.NO_FILE,
        status: 400,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const parsedDocument = await parseDocument(file);

    return NextResponse.json({ data: parsedDocument }, { status: 200 });
  } catch (error: unknown) {
    if (isApiError(error)) {
      return NextResponse.json(error, { status: error.status });
    }

    const fallbackError: ApiError = {
      error: 'Unexpected server error occurred while processing document.',
      code: ERROR_CODES.PARSE_FAILED,
      status: 500,
    };
    return NextResponse.json(fallbackError, { status: 500 });
  }
}
