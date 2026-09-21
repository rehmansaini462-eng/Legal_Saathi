/**
 * Core TypeScript type definitions for legal documents, parsing outputs, and API contracts.
 */

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain';

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

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
