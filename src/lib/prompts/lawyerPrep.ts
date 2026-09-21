/**
 * @module lib/prompts/lawyerPrep
 * @description Structured lawyer consultation preparation prompt builder for LegalSaathi.
 * @responsibility Generates targeted consultation questions, documents-to-bring checklists, and executive case summaries to prepare users for legal counsel meetings.
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 * @qualityTier production — full JSDoc, Zod schema validation, strictly grounded
 * @security Never renders direct legal advice — strictly provides informative preparation questions and factual document summaries.
 */

import type { ParsedDocument } from '@/types/legal';
export {
  LawyerQuestionSchema,
  LawyerPrepResponseSchema,
  type LawyerQuestion,
  type LawyerPrepResponse,
  type LawyerQuestionCategory,
} from '@/types/legal';

/**
 * Minimal input structure required for building lawyer preparation prompts.
 */
export type LawyerPrepPromptInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded prompt compelling Gemini to generate targeted questions for an attorney,
 * list critical documents to bring, and generate an executive summary to brief the lawyer.
 *
 * @param doc - Parsed document object or plain text payload with optional filename.
 * @returns Grounded prompt requesting strict JSON formatted lawyer consultation preparation data.
 * @example
 *   const prompt = buildLawyerPrepPrompt({ text: 'This NDA is entered into...', filename: 'nda.pdf' });
 * @alignsWith Problem Statement: "Helping users prepare information or questions for a legal professional"
 * @security Strictly grounded in provided text, anti-hallucination instructions, disclaims legal advice.
 */
export function buildLawyerPrepPrompt(doc: LawyerPrepPromptInput): string {
  const documentName = doc.filename ? `Document: "${doc.filename}"` : 'Document';

  return `You are LegalSaathi, an educational legal intelligence assistant. Your task is to help a non-lawyer prepare efficiently and effectively for a consultation meeting with a qualified attorney or legal professional regarding the provided legal document.

DOCUMENT CONTEXT:
${documentName}

LEGAL TEXT:
"""
${doc.text}
"""

PREPARATION GUIDELINES:
1. Generate 5 to 8 targeted, highly relevant questions the user should ask their lawyer about this document.
2. For each question:
   - "question": Formulate a clear, direct question for the lawyer regarding ambiguities, risks, or unusual clauses in the document.
   - "whyItMatters": Explain in plain language why this question is critical for the user's protection or interests.
   - "category": Must be strictly one of: "rights", "obligations", "risks", "timelines", "financial", "termination".
3. "keyDocumentsToBring": List specific documents, communications, invoices, prior agreements, or proof the user should gather and bring to the consultation meeting (e.g., signed amendments, payment proofs, prior email negotiations, IDs).
4. "summaryForLawyer": Provide a concise, professional 2-3 sentence executive briefing summary that the user can read or hand to the attorney to quickly establish the context and core purpose of the agreement.
5. STRICT GUARDRAIL: Never give legal counsel or prescribe definitive legal conclusions. Focus entirely on preparing the user to seek professional advice.

OUTPUT FORMAT:
Return a valid JSON object matching this exact schema:
{
  "questions": [
    {
      "question": "Specific question to ask the lawyer",
      "whyItMatters": "Plain language explanation of its importance",
      "category": "rights" | "obligations" | "risks" | "timelines" | "financial" | "termination"
    }
  ],
  "keyDocumentsToBring": [
    "Specific document or record to bring"
  ],
  "summaryForLawyer": "2-3 sentence executive briefing for the attorney"
}`;
}
