/**
 * @module config/constants
 * @description Single source of truth for application-wide configuration constants, payload limits, and standard error codes for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Owns system boundaries, error code enumerations, and validation thresholds across ingestion and parsing pipelines.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Enforces upload payload bounds to protect server memory from resource exhaustion and Denial of Service (DoS).
 */

import type { SupportedMimeType } from '@/types/legal';

/** Brand identity identifier used across metadata, titles, and UI headers. */
export const APP_NAME = 'LegalSaathi' as const;

/** Core value proposition tagline displayed on landing pages and headers to guide non-lawyers. */
export const APP_TAGLINE = 'Understand your legal documents in plain language' as const;

/** Upload size ceiling in megabytes to prevent memory spikes during in-memory parsing. */
export const MAX_FILE_SIZE_MB = 10 as const;

/** Byte representation of MAX_FILE_SIZE_MB used for fast byte-length boundary validation. */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Whitelist of MIME types accepted by the ingestion pipeline to reject unsafe file formats. */
export const ALLOWED_MIME_TYPES: readonly SupportedMimeType[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/** Mandatory legal liability disclaimer required to ensure compliance as an informational AI tool rather than a certified attorney. */
export const DISCLAIMER_TEXT =
  'This tool provides legal information, not legal advice. Consult a qualified lawyer for your specific situation.' as const;

/** Standard Gemini Generative AI model name optimized for speed, low latency, and structured extraction. */
export const GEMINI_MODEL = 'gemini-flash-latest' as const;

/** Timeout threshold in milliseconds for Google Gemini API calls (30 seconds). */
export const GEMINI_TIMEOUT_MS = 30000 as const;

/** Standardized error codes map ensuring consistent client-server error identification and UI error boundary mapping. */
export const ERROR_CODES = {
  INVALID_MIME: 'INVALID_MIME',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  EMPTY_FILE: 'EMPTY_FILE',
  PARSE_FAILED: 'PARSE_FAILED',
  NO_FILE: 'NO_FILE',
  SCANNED_PDF: 'SCANNED_PDF',
  INVALID_INPUT: 'INVALID_INPUT',
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  GEMINI_PARSE_ERROR: 'GEMINI_PARSE_ERROR',
  GEMINI_TIMEOUT: 'GEMINI_TIMEOUT',
} as const;

/** Union type representing all valid application error code literals. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
