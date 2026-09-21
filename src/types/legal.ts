/**
 * @module types/legal
 * @description Core TypeScript type definitions for legal documents, parsing outputs, and API contracts for LegalSaathi — a GenAI legal assistant that helps non-lawyers understand contracts, agreements, and policies.
 * @responsibility Serves as the single source of truth and contract between the backend API handlers and frontend UI components.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 * @security Prevents client-side type injection and guarantees structured error boundaries.
 */

import { z } from 'zod';

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
 * State container for plain-language AI summary generation and persistence.
 *
 * @example
 *   const state: SummaryState = {
 *     text: 'This contract obligates...',
 *     status: 'done'
 *   };
 */
export interface SummaryState {
  text: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  error?: ApiError;
}

/**
 * State container for extracted clause risk analysis and persistence.
 *
 * @example
 *   const state: ClausesState = {
 *     clauses: [{ id: '1', title: 'Liability', ... }],
 *     status: 'done'
 *   };
 */
export interface ClausesState {
  clauses: ClauseItem[];
  status: 'idle' | 'loading' | 'done' | 'error';
  error?: ApiError;
}

/**
 * Grounded citation linking an answer directly to quoted legal text and clause location.
 *
 * @example
 *   const citation: Citation = {
 *     quote: 'The Contractor shall deliver the deliverables within 30 days.',
 *     location: 'Clause 3.1 (Delivery Timeline)'
 *   };
 */
export interface Citation {
  quote: string;
  location: string;
}

/**
 * Confidence level of the Q&A model based on whether the fact was explicitly stated or inferred.
 */
export type QuestionConfidence = 'high' | 'medium' | 'low';

/**
 * Structured response payload for document Q&A queries.
 *
 * @example
 *   const res: AskResponse = {
 *     answer: 'The contract can be terminated by either party with 30 days notice.',
 *     citations: [{ quote: 'Either party may terminate...', location: 'Clause 9 (Termination)' }],
 *     confidence: 'high',
 *     notFoundInDocument: false
 *   };
 */
export interface AskResponse {
  answer: string;
  citations: Citation[];
  confidence: QuestionConfidence;
  notFoundInDocument: boolean;
}

/**
 * Designation of which party benefits from a specific contractual difference or term.
 */
export type BenefitsParty = 'A' | 'B' | 'both' | 'neither';

/**
 * Row representing comparison between two legal documents on a specific topic.
 *
 * @example
 *   const row: ComparisonRow = {
 *     topic: 'Liability Cap',
 *     docA: 'Capped at $50,000',
 *     docB: 'Uncapped unlimited liability',
 *     difference: 'Doc B exposes contractor to unlimited financial risk.',
 *     benefitsParty: 'A'
 *   };
 */
export interface ComparisonRow {
  topic: string;
  docA: string;
  docB: string;
  difference: string;
  benefitsParty: BenefitsParty;
}

/**
 * Structured response payload containing contract comparison matrix and executive summary.
 *
 * @example
 *   const comparison: ComparisonResponse = {
 *     rows: [
 *       {
 *         topic: 'Payment Terms',
 *         docA: 'Net 30',
 *         docB: 'Net 60',
 *         difference: 'Doc A requires payment 30 days sooner.',
 *         benefitsParty: 'A'
 *       }
 *     ],
 *     summary: 'Doc A offers substantially more favorable payment and termination terms.'
 *   };
 */
export interface ComparisonResponse {
  rows: ComparisonRow[];
  summary: string;
}

/**
 * Payload expected by the POST /api/ask endpoint.
 *
 * @example
 *   const req: AskRequest = {
 *     text: 'Agreement between...',
 *     filename: 'nda.pdf',
 *     question: 'What is the duration of confidentiality?'
 *   };
 */
export interface AskRequest {
  text: string;
  filename: string;
  question: string;
}

/**
 * Payload expected by the POST /api/compare endpoint.
 *
 * @example
 *   const req: CompareRequest = {
 *     docA: { text: 'Vendor Agreement v1...', filename: 'v1.pdf' },
 *     docB: { text: 'Vendor Agreement v2...', filename: 'v2.pdf' }
 *   };
 */
export interface CompareRequest {
  docA: {
    text: string;
    filename: string;
  };
  docB: {
    text: string;
    filename: string;
  };
}

/**
 * State container for document Q&A history and UI interaction state.
 *
 * @example
 *   const state: AskState = {
 *     history: [{ question: 'What is the penalty?', response: null }],
 *     status: 'loading'
 *   };
 */
export interface AskState {
  history: Array<{
    question: string;
    response: AskResponse | null;
    error?: ApiError;
  }>;
  status: 'idle' | 'loading' | 'done' | 'error';
}

/**
 * State container for document comparison results and UI interaction state.
 *
 * @example
 *   const state: CompareState = {
 *     comparison: null,
 *     status: 'idle'
 *   };
 */
export interface CompareState {
  comparison: ComparisonResponse | null;
  status: 'idle' | 'loading' | 'done' | 'error';
  error?: ApiError;
}

/**
 * Zod schema for Citation structure validation.
 */
export const CitationSchema = z.object({
  quote: z.string().describe('Direct verbatim quotation from the legal document text'),
  location: z.string().describe('Clause name, section heading, or paragraph location reference'),
});

/**
 * Zod schema for AskResponse structure validation.
 */
export const AskResponseSchema = z.object({
  answer: z.string().describe('Plain-language grounded answer to the user question'),
  citations: z
    .array(CitationSchema)
    .describe('List of exact quoted citations supporting the answer'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence assessment score'),
  notFoundInDocument: z
    .boolean()
    .describe('Flag set to true if the question cannot be answered from the provided text'),
});

/**
 * Zod schema for ComparisonRow structure validation.
 */
export const ComparisonRowSchema = z.object({
  topic: z.string().describe('Legal topic being compared, e.g. Payment, Liability, Termination'),
  docA: z.string().describe('Summary of terms in Document A for this topic'),
  docB: z.string().describe('Summary of terms in Document B for this topic'),
  difference: z.string().describe('Plain-language explanation of how the two documents differ'),
  benefitsParty: z
    .enum(['A', 'B', 'both', 'neither'])
    .describe('Which party or document has the more advantageous position'),
});

/**
 * Zod schema for ComparisonResponse structure validation.
 */
export const ComparisonResponseSchema = z.object({
  rows: z.array(ComparisonRowSchema).describe('Matrix of topic-by-topic comparison rows'),
  summary: z.string().describe('High-level executive comparison summary comparing both documents'),
});

/**
 * Zod schema for validating incoming AskRequest payloads.
 */
export const AskRequestSchema = z.object({
  text: z.string().trim().min(10, { message: 'Document text must be at least 10 characters.' }),
  filename: z.string().optional().default('document.txt'),
  question: z
    .string()
    .trim()
    .min(3, { message: 'Question must be at least 3 characters long.' })
    .max(500, { message: 'Question must not exceed 500 characters.' }),
});

/**
 * Zod schema for validating individual document objects in comparison requests.
 */
const compareDocItemSchema = z.object({
  text: z.string().trim().min(10, { message: 'Document text must be at least 10 characters.' }),
  filename: z.string().optional().default('document.txt'),
});

/**
 * Zod schema for validating incoming CompareRequest payloads.
 */
export const CompareRequestSchema = z.object({
  docA: compareDocItemSchema,
  docB: compareDocItemSchema,
});

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
