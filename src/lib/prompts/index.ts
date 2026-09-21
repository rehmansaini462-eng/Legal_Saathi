/**
 * @module lib/prompts
 * @description Centralized barrel exports for prompt builders, safety guardrails, and LLM schemas.
 * @responsibility Re-exports prompt templates for summarization, clause risk extraction, and safety instructions.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, pure functions
 */

export { SAFETY_INSTRUCTIONS } from './guardrails';
export { buildSummaryPrompt, type SummarizePromptInput } from './summarize';
export {
  buildClausesPrompt,
  ClauseItemSchema,
  ClausesResponseSchema,
  type ClausesPromptInput,
  type ClausesResponseData,
} from './clauses';
export { buildAskPrompt, AskResponseSchema, type AskPromptInput, type AskResponse } from './ask';
export {
  buildComparePrompt,
  ComparisonResponseSchema,
  ComparisonRowSchema,
  type ComparePromptDocInput,
  type ComparisonResponse,
  type ComparisonRow,
} from './compare';
