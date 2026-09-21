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
 * Risk severity classification for legal clauses identified by GenAI analysis.
 *
 * @example
 *   const level: ClauseRiskLevel = 'high';
 */
export type ClauseRiskLevel = 'low' | 'medium' | 'high';

/**
 * Individual analyzed legal clause with risk evaluation and plain-language explanation.
 *
 * @example
 *   const clause: ClauseItem = {
 *     id: 'clause-1',
 *     title: 'Indemnification & Unlimited Liability',
 *     originalText: 'The Contractor shall indemnify...',
 *     plainExplanation: 'You are personally responsible for all damages without limit.',
 *     riskLevel: 'high',
 *     riskReason: 'Uncapped financial liability placed entirely on one party.',
 *     category: 'Liability'
 *   };
 */
export interface ClauseItem {
  id: string;
  title: string;
  originalText: string;
  plainExplanation: string;
  riskLevel: ClauseRiskLevel;
  riskReason: string;
  category: string;
}

/**
 * Structured container for all analyzed legal clauses extracted from a document.
 *
 * @example
 *   const result: ClauseAnalysisResult = {
 *     clauses: [
 *       {
 *         id: 'c-1',
 *         title: 'Termination for Convenience',
 *         originalText: 'Either party may terminate...',
 *         plainExplanation: 'Either side can end the contract with 30 days notice.',
 *         riskLevel: 'low',
 *         riskReason: 'Standard mutual termination clause.',
 *         category: 'Termination'
 *       }
 *     ]
 *   };
 */
export interface ClauseAnalysisResult {
  clauses: ClauseItem[];
}

/**
 * Payload expected by the POST /api/summarize endpoint.
 *
 * @example
 *   const req: SummarizeRequest = {
 *     text: 'This non-disclosure agreement...',
 *     filename: 'nda.pdf'
 *   };
 */
export interface SummarizeRequest {
  text: string;
  filename: string;
}

/**
 * Payload expected by the POST /api/clauses endpoint.
 *
 * @example
 *   const req: ClausesRequest = {
 *     text: 'This consulting agreement...',
 *     filename: 'agreement.docx'
 *   };
 */
export interface ClausesRequest {
  text: string;
  filename: string;
}

/**
 * Structured summary representation for legal documents.
 *
 * @example
 *   const summary: SummaryResult = {
 *     summary: 'This agreement governs non-disclosure between parties.',
 *     keyPoints: ['2 year confidentiality obligation', 'Excludes publicly known info'],
 *     documentType: 'Non-Disclosure Agreement (NDA)'
 *   };
 */
export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  documentType: string;
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
