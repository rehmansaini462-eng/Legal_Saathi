/**
 * Document parsing and text extraction engine for legal contracts (PDF, DOCX, TXT).
 */

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { ALLOWED_MIME_TYPES, ERROR_CODES, MAX_FILE_SIZE_BYTES } from '@/config/constants';
import type { ApiError, ParsedDocument, SupportedMimeType } from '@/types/legal';

/**
 * Type guard to check if an unknown error object matches the ApiError contract.
 *
 * @param value - The unknown value to check.
 * @returns True if value is an ApiError.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'code' in value &&
    'status' in value &&
    typeof (value as Record<string, unknown>).error === 'string' &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    typeof (value as Record<string, unknown>).status === 'number'
  );
}

/**
 * Sanitizes extracted text by removing null bytes, normalizing newlines, and trimming excess whitespace.
 *
 * @param text - The raw extracted text string.
 * @returns Cleaned and sanitized string.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses a legal document file into structured text, word counts, and metadata.
 *
 * @param file - The browser or uploaded File object.
 * @returns Promise resolving to a ParsedDocument object.
 * @throws ApiError if the file is invalid, unsupported, empty, or exceeds size limits.
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const mimeType = file.type as SupportedMimeType;

  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    const error: ApiError = {
      error: `Unsupported file type: ${file.type || 'unknown'}. Allowed types: PDF, DOCX, TXT.`,
      code: ERROR_CODES.INVALID_MIME,
      status: 415,
    };
    throw error;
  }

  // 2. Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const error: ApiError = {
      error: `File size exceeds the 10MB limit (received ${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
      code: ERROR_CODES.FILE_TOO_LARGE,
      status: 413,
    };
    throw error;
  }

  // 3. Validate not empty
  if (file.size === 0) {
    const error: ApiError = {
      error: 'The uploaded file is empty.',
      code: ERROR_CODES.EMPTY_FILE,
      status: 400,
    };
    throw error;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let rawText = '';
  let pages: number | undefined;
  const warnings: string[] = [];

  try {
    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      pages = pdfData.numpages;
      rawText = pdfData.text || '';

      const cleanedPreview = rawText.replace(/\s+/g, '');
      if (cleanedPreview.length < 50) {
        warnings.push('This PDF appears to be scanned. OCR support is coming soon.');
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const docxData = await mammoth.extractRawText({ buffer });
      rawText = docxData.value || '';
    } else if (mimeType === 'text/plain') {
      rawText = buffer.toString('utf-8');
    }
  } catch (err: unknown) {
    if (isApiError(err)) {
      throw err;
    }
    const error: ApiError = {
      error: 'Failed to extract text from document.',
      code: ERROR_CODES.PARSE_FAILED,
      status: 500,
    };
    throw error;
  }

  const sanitizedText = sanitizeText(rawText);

  if (sanitizedText.length === 0 && warnings.length === 0) {
    const error: ApiError = {
      error: 'No readable text could be extracted from the file.',
      code: ERROR_CODES.PARSE_FAILED,
      status: 422,
    };
    throw error;
  }

  const charCount = sanitizedText.length;
  const wordCount =
    sanitizedText.length === 0 ? 0 : sanitizedText.split(/\s+/).filter(Boolean).length;

  const parsedDoc: ParsedDocument = {
    text: sanitizedText,
    filename: file.name,
    mimeType,
    sizeBytes: file.size,
    wordCount,
    charCount,
    ...(pages !== undefined ? { pages } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    parsedAt: new Date().toISOString(),
  };

  return parsedDoc;
}
