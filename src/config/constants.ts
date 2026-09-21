/**
 * Application-wide configuration constants, limits, and standard error codes.
 */

import type { SupportedMimeType } from '@/types/legal';

export const APP_NAME = 'LegalSaathi' as const;

export const APP_TAGLINE = 'Understand your legal documents in plain language' as const;

export const MAX_FILE_SIZE_MB = 10 as const;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES: readonly SupportedMimeType[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const DISCLAIMER_TEXT =
  'This tool provides legal information, not legal advice. Consult a qualified lawyer for your specific situation.' as const;

export const ERROR_CODES = {
  INVALID_MIME: 'INVALID_MIME',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  EMPTY_FILE: 'EMPTY_FILE',
  PARSE_FAILED: 'PARSE_FAILED',
  NO_FILE: 'NO_FILE',
  SCANNED_PDF: 'SCANNED_PDF',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
