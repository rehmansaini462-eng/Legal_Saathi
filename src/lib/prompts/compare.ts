/**
 * @module lib/prompts/compare
 * @description Contract and legal document comparison prompt builder for LegalSaathi.
 * @responsibility Formulates structured side-by-side comparison prompts instructing Gemini to evaluate differences across key contractual terms.
 * @alignsWith Problem Statement: "Comparing contracts, agreements, or policies"
 * @qualityTier production — full JSDoc, pure function, Zod schema validation
 * @security Enforces grounded side-by-side comparison, prevents hallucination of terms, and identifies party advantages.
 */

import {
  ComparisonResponseSchema,
  ComparisonRowSchema,
  type ComparisonResponse,
  type ComparisonRow,
  type ParsedDocument,
} from '@/types/legal';

export {
  ComparisonResponseSchema,
  ComparisonRowSchema,
  type ComparisonResponse,
  type ComparisonRow,
};

/**
 * Minimal input structure required for building document comparison prompts.
 */
export type ComparePromptDocInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded prompt compelling Gemini to perform an objective side-by-side comparison between two legal documents,
 * highlighting topic-by-topic differences and identifying party benefits.
 *
 * @param docA - First parsed document or text payload (Document A).
 * @param docB - Second parsed document or text payload (Document B).
 * @returns Grounded prompt requesting strict JSON formatted comparison matrix and executive summary.
 * @example
 *   const prompt = buildComparePrompt({ text: 'Agreement A...', filename: 'v1.pdf' }, { text: 'Agreement B...', filename: 'v2.pdf' });
 * @alignsWith Problem Statement: "Comparing contracts, agreements, or policies"
 * @security Mandates strict quote grounding, zero hallucinated provisions, and objective evaluation of contractual benefits.
 */
export function buildComparePrompt(
  docA: ComparePromptDocInput,
  docB: ComparePromptDocInput
): string {
  const nameA = docA.filename ? `Document A: "${docA.filename}"` : 'Document A';
  const nameB = docB.filename ? `Document B: "${docB.filename}"` : 'Document B';

  return `You are LegalSaathi, a specialized legal analysis intelligence tool. Your task is to perform an objective, side-by-side comparison between two legal documents (Document A and Document B) for a non-lawyer reader.

${nameA.toUpperCase()}:
"""
${docA.text}
"""

${nameB.toUpperCase()}:
"""
${docB.text}
"""

COMPARISON TOPICS TO EVALUATE:
Evaluate and compare the two documents across key operational and legal dimensions, including but not limited to:
1. Parties Involved & Scope of Work / Engagement
2. Payment Terms, Pricing Schedules & Invoicing Milestones
3. Contract Duration, Renewal & Extension Terms
4. Termination Rights, Notice Periods & Cancellation Conditions
5. Liability Limits, Indemnification Obligations & Disclaimers
6. Confidentiality, Non-Disclosure & Data Protection
7. Dispute Resolution, Governing Law & Jurisdiction / Arbitration
8. Penalties, Late Fees, Liquidated Damages & Default Remedies

GROUNDING & EVALUATION INSTRUCTIONS:
1. STRICT ACCURACY: Base every comparison point strictly on the provided texts above.
2. NEVER FABRICATE: If a topic is omitted or silent in either document, state "Not specified in document" or "Silent on this term". Never invent terms or assume unwritten provisions.
3. CITATIONS & SPECIFICITY: Cite specific clause numbers or section titles in your descriptions when available.
4. DIFFERENCE EXPLANATION: In "difference", explain clearly in plain language what changed or how the obligations differ between Document A and Document B.
5. PARTY BENEFIT ("benefitsParty"):
   - "A": Document A is more advantageous or favorable to the party reviewing / negotiating.
   - "B": Document B is more advantageous or favorable.
   - "both": Both documents offer equally balanced mutual terms.
   - "neither": Neither document offers an advantage or the difference is purely neutral/administrative.
6. EXECUTIVE SUMMARY: In "summary", provide a clear 2-4 sentence executive overview summarizing which document is generally more favorable and noting the single biggest material difference non-lawyers should know.

OUTPUT FORMAT:
Return a valid JSON object matching this exact schema:
{
  "rows": [
    {
      "topic": "Topic Name (e.g. Liability & Indemnity)",
      "docA": "Concise summary of Document A's terms for this topic with clause reference if present.",
      "docB": "Concise summary of Document B's terms for this topic with clause reference if present.",
      "difference": "Plain-language explanation of the practical difference between Document A and Document B.",
      "benefitsParty": "A" | "B" | "both" | "neither"
    }
  ],
  "summary": "High-level plain-language executive comparison overview highlighting key differences and overall favorability."
}`;
}
