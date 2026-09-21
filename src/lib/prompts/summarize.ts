/**
 * @module lib/prompts/summarize
 * @description Plain-language summary prompt generator for legal documents in LegalSaathi.
 * @responsibility Generates structured prompts compelling Gemini to break down legal contracts for non-lawyers.
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @qualityTier production — full JSDoc, pure prompt builder
 * @security Grounded strictly in uploaded text with no external knowledge injection.
 */

import type { ParsedDocument } from '@/types/legal';

/**
 * Minimal input structure required for building document summary prompts.
 */
export type SummarizePromptInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded, structured prompt to generate a plain-language summary of a legal document.
 * Instructs Gemini to cite clause references, avoid legalese, format clearly, and never invent content.
 *
 * @param doc - Parsed document object or plain text payload with optional filename.
 * @returns Grounded plain-language prompt ready for Gemini model consumption.
 * @example
 *   const prompt = buildSummaryPrompt({ text: 'This Master Agreement...', filename: 'contract.pdf' });
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @security Directs model to reject fabrication and only summarize verified content from document text.
 */
export function buildSummaryPrompt(doc: SummarizePromptInput): string {
  const documentName = doc.filename ? `Document: "${doc.filename}"` : 'Document';

  return `You are LegalSaathi, an empathetic AI legal comprehension assistant built to help everyday non-lawyers understand complex contracts, agreements, and policies in clear, jargon-free plain language.

DOCUMENT CONTEXT:
${documentName}

LEGAL TEXT:
"""
${doc.text}
"""

INSTRUCTIONS:
1. Explain the document in simple, everyday language so a non-lawyer can clearly understand what they are reading.
2. Structure your summary with the following distinct markdown sections:
   - **Document Purpose & Type**: What kind of agreement is this, and what is its core objective?
   - **Key Rights & Obligations**: What must each party do, and what rights do they hold?
   - **Critical Deadlines & Financial Terms**: Important dates, durations, payments, fees, or penalties.
   - **Termination & Exit Conditions**: How can either party leave this agreement?
   - **Actionable Takeaways / Next Steps**: Bulleted checklist of what the reader should verify before signing or agreeing.
3. Cite clause numbers, section headings, or paragraph numbers wherever referencing specific terms (e.g., "[Clause 4.2]").
4. STRICT GROUNDING: Never invent, extrapolate, or hallucinate terms, clauses, or obligations not explicitly stated in the provided text.
5. If the document is too short, ambiguous, or lacks crucial terms, explicitly note those gaps in your summary.
6. Provide an objective, clear breakdown with zero legal advice.`;
}
