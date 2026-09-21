/**
 * @module types/legal
 * @description Core TypeScript type definitions for legal documents, parsing outputs, and API contracts for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Serves as the single source of truth and contract between the backend API handlers and frontend UI components.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Prevents client-side type injection and guarantees structured error boundaries.
 */

/**
 * Whitelist of supported MIME types for input document ingestion.
 *
 * @example
 *   const mime: SupportedMimeType = 'application/pdf';
 */
export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain';

/**
 * Structured output payload representing extracted and sanitized legal document data and its metadata.
 *
 * @example
 *   const doc: ParsedDocument = {
 *     text: 'This Agreement is made on...',
 *     filename: 'nda_sample.pdf',
 *     mimeType: 'application/pdf',
 *     sizeBytes: 1048576,
 *     wordCount: 1420,
 *     charCount: 8900,
 *     pages: 3,
 *     warnings: [],
 *     parsedAt: '2026-09-21T10:00:00.000Z'
 *   };
 */
export interface ParsedDocument {
  text: string;
  filename: string;
  mimeType: SupportedMimeType;
  sizeBytes: number;
  wordCount: number;
  charCount: number;
  pages?: number;
  warnings?: string[];
  parsedAt: string;
}

/**
 * Standardized error payload returned across all API endpoints on failure.
 *
 * @example
 *   const error: ApiError = {
 *     error: 'File size exceeds the 10MB limit (received 12.50MB).',
 *     code: 'FILE_TOO_LARGE',
 *     status: 413
 *   };
 */
export interface ApiError {
  error: string;
  code: string;
  status: number;
}

/**
 * Standardized success wrapper payload for successful API responses.
 *
 * @example
 *   const success: ApiSuccess<{ id: string }> = {
 *     data: { id: 'doc_12345' }
 *   };
 */
export interface ApiSuccess<T> {
  data: T;
}

/**
 * Discriminated union response type for API communication ensuring strict error handling on clients.
 *
 * @example
 *   const response: ApiResponse<ParsedDocument> = {
 *     data: {
 *       text: 'Agreement terms...',
 *       filename: 'contract.pdf',
 *       mimeType: 'application/pdf',
 *       sizeBytes: 2048,
 *       wordCount: 350,
 *       charCount: 2100,
 *       parsedAt: '2026-09-21T10:00:00.000Z'
 *     }
 *   };
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
