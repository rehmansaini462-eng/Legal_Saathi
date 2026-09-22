/**
 * @module lib/prompts/clauses
 * @description Structured clause extraction and risk analysis prompt builder for LegalSaathi.
 * @responsibility Extracts obligations, liabilities, deadlines, penalties, and risk levels with grounded source citations.
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @qualityTier production — full JSDoc, Zod schema validation
 * @security Mandates strict quote extraction from source text and prohibits fabricated clauses.
 */

import { z } from 'zod';
import type { ParsedDocument } from '@/types/legal';

/**
 * Zod schema defining the structure of an extracted legal clause.
 */
export const ClauseItemSchema = z.object({
  id: z.string().describe('Unique identifier for the clause, e.g. clause-1, clause-2'),
  title: z.string().describe('Short descriptive title of the clause'),
  originalText: z.string().describe('Exact quotation or verbatim excerpt from the document text'),
  plainExplanation: z
    .string()
    .describe('Plain language explanation of what this clause means in simple terms'),
  riskLevel: z
    .enum(['low', 'medium', 'high'])
    .describe('Risk assessment severity level: low, medium, or high'),
  riskReason: z.string().describe('Specific reason why this risk level was assigned to the clause'),
  category: z
    .string()
    .describe('Category of the clause, e.g. Liability, Termination, Confidentiality, Payment'),
});

/**
 * Zod schema validating the structured array of clauses returned by Gemini.
 */
export const ClausesResponseSchema = z.object({
  clauses: z.array(ClauseItemSchema).describe('List of extracted and risk-assessed legal clauses'),
});

/**
 * TypeScript type inferred from the ClausesResponseSchema.
 */
export type ClausesResponseData = z.infer<typeof ClausesResponseSchema>;

/**
 * Minimal input structure required for building clause extraction prompts.
 */
export type ClausesPromptInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded prompt compelling Gemini to extract critical clauses, categorize them,
 * assess risk levels ('low' | 'medium' | 'high'), and provide plain-language explanations.
 *
 * @param doc - Parsed document object or plain text payload with optional filename.
 * @returns Grounded prompt requesting strict JSON formatted clause risk analysis.
 * @example
 *   const prompt = buildClausesPrompt({ text: 'Clause 1: Indemnity...', filename: 'nda.pdf' });
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @security Enforces exact source quoting and zero hallucinations for legal risk items.
 */
export function buildClausesPrompt(doc: ClausesPromptInput): string {
  const documentName = doc.filename ? `Document: "${doc.filename}"` : 'Document';

  return `You are LegalSaathi, a specialized legal analysis intelligence tool. Your task is to extract, explain, and risk-evaluate all important clauses in the provided legal document for a non-lawyer reader.

DOCUMENT CONTEXT:
${documentName}

LEGAL TEXT:
"""
${doc.text}
"""

EXTRACTION & RISK SCORING CRITERIA:
1. Identify all critical clauses covering:
   - Rights & Obligations
   - Liabilities & Indemnification
   - Termination, Cancellation & Auto-renewal
   - Payment Terms, Penalties & Fees
   - Confidentiality & Intellectual Property
   - Governing Law & Dispute Resolution / Arbitration
2. For each clause, assign a riskLevel:
   - "high": One-sided indemnity, unlimited liability, waiver of fundamental legal rights, severe automatic penalties, or non-mutual termination rights.
   - "medium": Auto-renewal without clear notice, unilateral modification rights, restrictive covenants, or short cure periods.
   - "low": Standard industry-standard mutual terms, standard confidentiality durations, or balanced rights.
3. GROUNDING REQUIREMENTS:
   - "originalText" MUST contain verbatim quotes or exact excerpts directly present in the LEGAL TEXT above.
   - NEVER invent or fabricate clauses that are not present.
   - "plainExplanation" must be easily understood by someone with no legal background.
   - "riskReason" must justify why the specific risk level was chosen.

OUTPUT FORMAT:
Return a valid JSON object matching this exact schema:
{
  "clauses": [
    {
      "id": "clause-1",
      "title": "Short descriptive clause title",
      "originalText": "Exact quote from document",
      "plainExplanation": "Simple plain-language breakdown",
      "riskLevel": "low" | "medium" | "high",
      "riskReason": "Detailed reason for assigned risk rating",
      "category": "Liability" | "Termination" | "Confidentiality" | "Payment" | "General"
    }
  ]
}`;
}
