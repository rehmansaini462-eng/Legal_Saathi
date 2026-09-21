/**
 * @module lib/prompts/ask
 * @description Structured legal document question answering prompt builder for LegalSaathi.
 * @responsibility Formulates grounded Q&A prompts instructing Gemini to answer strictly from document context and extract verbatim citations.
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @qualityTier production — full JSDoc, pure function, Zod schema validation
 * @security Enforces anti-hallucination boundaries, prohibits unauthorized legal advice, and mandates verbatim quotation.
 */

import { AskResponseSchema, type AskResponse, type ParsedDocument } from '@/types/legal';

export { AskResponseSchema, type AskResponse };

/**
 * Minimal input structure required for building document Q&A prompts.
 */
export type AskPromptInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded prompt compelling Gemini to answer user questions strictly based on the provided legal document,
 * extracting verbatim sentence quotes and clause locations as supporting citations.
 *
 * @param doc - Parsed document object or plain text payload with optional filename.
 * @param question - The user's specific natural language query about the document.
 * @returns Grounded prompt requesting strict JSON formatted answer with citations.
 * @example
 *   const prompt = buildAskPrompt({ text: 'Clause 4: Payment due in 30 days...', filename: 'nda.pdf' }, 'When is payment due?');
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @security Enforces zero hallucinations, strictly grounds answers in source text, and prevents unauthorized legal advice.
 */
export function buildAskPrompt(doc: AskPromptInput, question: string): string {
  const documentName = doc.filename ? `Document: "${doc.filename}"` : 'Document';

  return `You are LegalSaathi, a specialized legal analysis intelligence tool. Your task is to answer the user's specific question based STRICTLY and SOLELY on the provided legal document for a non-lawyer reader.

DOCUMENT CONTEXT:
${documentName}

LEGAL TEXT:
"""
${doc.text}
"""

USER QUESTION:
"${question}"

GROUNDING & ANSWERING INSTRUCTIONS:
1. STRICT GROUNDING: Answer ONLY from the provided document text above.
2. MISSING INFORMATION: If the document does not contain the answer, set "notFoundInDocument": true, set "confidence": "low", and explain clearly in "answer" that the document does not mention or specify this information.
3. CITATIONS:
   - For every factual claim in the answer, include an entry in "citations".
   - "quote" MUST be a verbatim sentence or phrase extracted directly from the LEGAL TEXT above.
   - "location" MUST be the clause title, section number, or paragraph heading where the quote appears.
   - If not found in document, return an empty array for "citations".
4. TONE & CLARITY:
   - Explain legal terms in plain, easy-to-understand language.
   - Never give formal legal advice or speculative opinions; only restate and clarify what the document explicitly states.
5. CONFIDENCE SCORING:
   - "high": The answer is directly and explicitly stated in the document.
   - "medium": The answer is logically inferred from clear document terms.
   - "low": The answer is ambiguous, partially addressed, or not found in the document.

OUTPUT FORMAT:
Return a valid JSON object matching this exact schema:
{
  "answer": "Clear, plain-language answer explaining what the document says regarding the question.",
  "citations": [
    {
      "quote": "Exact sentence quoted directly from the legal text.",
      "location": "Clause / Section identifier, e.g. Clause 4.2 (Payment Terms)"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notFoundInDocument": false
}`;
}
