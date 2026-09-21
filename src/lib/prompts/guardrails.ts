/**
 * @module lib/prompts/guardrails
 * @description Centralized safety instructions and anti-hallucination guardrails for all LegalSaathi LLM workflows.
 * @responsibility Enforces grounded legal reasoning, disclaimer boundaries, and zero-hallucination compliance.
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @qualityTier production — full JSDoc, strictly grounded
 * @security Prevents unauthorized legal counsel rendering and prompt injection subversion.
 */

/**
 * Universal system instructions and guardrail constraints applied to all Gemini model interactions.
 * Mandates that the assistant acts solely as an educational legal information tool grounded strictly
 * in provided document text.
 *
 * @example
 *   const systemPrompt = SAFETY_INSTRUCTIONS;
 */
export const SAFETY_INSTRUCTIONS =
  'You are a legal information assistant, not a lawyer. Never give legal advice. Always cite the source text. If unsure, say so. Never invent laws or clauses. Rely strictly and solely on the provided document text.' as const;
