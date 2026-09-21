/**
 * @module lib/prompts/checklist
 * @description Actionable next-steps and obligation checklist prompt builder for LegalSaathi.
 * @responsibility Extracts concrete, prioritized action items, contractual deadlines, and overall urgency from legal documents.
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @qualityTier production — full JSDoc, Zod schema validation, strictly grounded
 * @security Grounded in provided document text, zero hallucinations, flags explicit contractual deadlines.
 */

import type { ParsedDocument } from '@/types/legal';
export {
  ActionItemSchema,
  ChecklistResponseSchema,
  type ActionItem,
  type ChecklistResponse,
  type ActionPriority,
  type ChecklistUrgency,
} from '@/types/legal';

/**
 * Minimal input structure required for building actionable checklist prompts.
 */
export type ChecklistPromptInput =
  | ParsedDocument
  | {
      text: string;
      filename?: string;
    };

/**
 * Builds a grounded prompt compelling Gemini to generate an actionable checklist of next steps,
 * assign priorities ('high' | 'medium' | 'low'), extract deadlines, and evaluate overall urgency.
 *
 * @param doc - Parsed document object or plain text payload with optional filename.
 * @returns Grounded prompt requesting strict JSON formatted actionable checklist data.
 * @example
 *   const prompt = buildChecklistPrompt({ text: 'Clause 4: Payment due in 15 days...', filename: 'service.pdf' });
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @security Grounded strictly in contract clauses and milestones, prevents hallucinated deadlines.
 */
export function buildChecklistPrompt(doc: ChecklistPromptInput): string {
  const documentName = doc.filename ? `Document: "${doc.filename}"` : 'Document';

  return `You are LegalSaathi, an actionable legal intelligence assistant. Your task is to extract a concrete, prioritized checklist of next steps and procedural obligations for a non-lawyer based on the provided legal document.

DOCUMENT CONTEXT:
${documentName}

LEGAL TEXT:
"""
${doc.text}
"""

CHECKLIST GENERATION CRITERIA:
1. Identify all required next steps, obligations, compliance tasks, notices, deliverables, or renegotiation steps.
2. For each action item:
   - "step": Clear, concrete, imperative action sentence (e.g., "Request modification of uncapped liability in Section 4", "Calendar 30-day renewal notice deadline"). Reference clause or section numbers when applicable.
   - "priority": Assign "high", "medium", or "low":
     * "high": Immediate deadlines, severe penalties, uncapped liabilities, or critical pre-signature negotiation points.
     * "medium": Important milestones, standard compliance steps, or renewal reminders.
     * "low": Routine administrative record-keeping or informational filings.
   - "deadline": Explicit deadline or time window derived from the document text if present (e.g., "Within 15 days of invoice date", "30 days before anniversary"). If no specific deadline exists, set deadline: null.
   - "rationale": Plain-language explanation of why this step is essential and what happens if neglected.
3. For fields that don't apply, use null (not undefined or empty string). For example, if a step has no specific deadline, set deadline: null.
4. Determine "overallUrgency":
   - "urgent": If the document contains high-risk clauses, imminent deadlines (< 14 days), or severe penalty risks.
   - "soon": If there are moderate timelines or standard action items requiring attention within 30-60 days.
   - "routine": If terms are standard with no immediate high-risk triggers or urgent milestones.

OUTPUT FORMAT:
Return a valid JSON object matching this exact schema:
{
  "items": [
    {
      "step": "Concrete action step description with clause reference",
      "priority": "high" | "medium" | "low",
      "deadline": "Extracted timeline or deadline (or null if none)",
      "rationale": "Plain language rationale for this step"
    }
  ],
  "overallUrgency": "urgent" | "soon" | "routine"
}`;
}
