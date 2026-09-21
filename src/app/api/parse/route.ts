/**
 * API route handler for uploading and parsing legal documents (PDF, DOCX, TXT).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { ERROR_CODES } from '@/config/constants';
import { isApiError, parseDocument } from '@/lib/parser';
import type { ApiError, ApiResponse, ParsedDocument } from '@/types/legal';

export const runtime = 'nodejs';

/**
 * Handles multipart/form-data document upload and returns parsed text and metadata.
 *
 * @param request - Incoming Next.js HTTP request containing multipart/form-data.
 * @returns JSON response conforming to ApiResponse<ParsedDocument>.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ParsedDocument>>> {
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
