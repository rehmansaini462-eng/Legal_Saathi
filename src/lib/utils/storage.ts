/**
 * @module lib/utils/storage
 * @description Type-safe browser sessionStorage utilities with Zod schema validation for LegalSaathi.
 * @responsibility Persists and hydrates client-side legal summary and clause risk analysis state across tab switches and page reloads.
 * @alignsWith Problem Statement: "Helping users understand their options and potential next steps"
 * @qualityTier production — full JSDoc, strict TypeScript, Zod runtime validation
 * @security Defends against deserialization errors and corrupted client storage via schema validation.
 */

import { z } from 'zod';
import type {
  SummaryState,
  ClausesState,
  ClauseItem,
  ApiError,
  ClauseRiskLevel,
  AskState,
  CompareState,
} from '@/types/legal';
import { AskResponseSchema, ComparisonResponseSchema } from '@/types/legal';

/**
 * Zod schema validating structured API error objects.
 */
export const apiErrorSchema: z.ZodType<ApiError> = z.object({
  error: z.string(),
  code: z.string(),
  status: z.number(),
});

/**
 * Zod schema validating persisted plain-language summary states.
 */
export const summaryStateSchema: z.ZodType<SummaryState> = z.object({
  text: z.string(),
  status: z.enum(['idle', 'streaming', 'done', 'error']),
  error: apiErrorSchema.optional(),
});

/**
 * Zod schema validating clause risk classification levels.
 */
export const clauseRiskLevelSchema: z.ZodType<ClauseRiskLevel> = z.enum(['low', 'medium', 'high']);

/**
 * Zod schema validating individual extracted legal clauses.
 */
export const clauseItemSchema: z.ZodType<ClauseItem> = z.object({
  id: z.string(),
  title: z.string(),
  originalText: z.string(),
  plainExplanation: z.string(),
  riskLevel: clauseRiskLevelSchema,
  riskReason: z.string(),
  category: z.string(),
});

/**
 * Zod schema validating persisted clause analysis states.
 */
export const clausesStateSchema: z.ZodType<ClausesState> = z.object({
  clauses: z.array(clauseItemSchema),
  status: z.enum(['idle', 'loading', 'done', 'error']),
  error: apiErrorSchema.optional(),
});

/**
 * Zod schema validating persisted document Q&A history states.
 */
export const askStateSchema: z.ZodType<AskState> = z.object({
  history: z.array(
    z.object({
      question: z.string(),
      response: AskResponseSchema.nullable(),
      error: apiErrorSchema.optional(),
    })
  ),
  status: z.enum(['idle', 'loading', 'done', 'error']),
});

/**
 * Zod schema validating persisted contract comparison states.
 */
export const compareStateSchema: z.ZodType<CompareState> = z.object({
  comparison: ComparisonResponseSchema.nullable(),
  status: z.enum(['idle', 'loading', 'done', 'error']),
  error: apiErrorSchema.optional(),
});

/**
 * Well-known sessionStorage keys for LegalSaathi application state.
 */
export const STORAGE_KEYS = {
  SUMMARY: 'legalsaathi:summary',
  CLAUSES: 'legalsaathi:clauses',
  ASK: 'legalsaathi:ask',
  COMPARE: 'legalsaathi:compare',
} as const;

/**
 * Loads and validates a typed value from browser sessionStorage using a Zod schema.
 * Protects against corrupted storage, schema drift, and SSR runtime exceptions.
 *
 * @template T - Target data type expected from storage.
 * @param key - The sessionStorage key to read.
 * @param schema - The Zod schema to validate deserialized JSON against.
 * @returns The validated data if successful and present, or null otherwise.
 * @example
 *   const state = loadFromSession('legalsaathi:summary', summaryStateSchema);
 * @alignsWith Problem Statement: "Persisting validated legal analysis across user workflows"
 * @security Enforces runtime schema validation to reject corrupted or tampered storage data.
 */
export function loadFromSession<T>(key: string, schema: z.ZodSchema<T>): T | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Serializes and saves a typed value to browser sessionStorage.
 * Safely handles SSR and catches runtime storage exceptions (e.g., storage quota exceeded).
 *
 * @template T - The type of value being stored.
 * @param key - The sessionStorage key to write.
 * @param value - The value to JSON-serialize and store.
 * @example
 *   saveToSession('legalsaathi:summary', { text: 'Summary...', status: 'done' });
 * @alignsWith Problem Statement: "Persisting validated legal analysis across user workflows"
 */
export function saveToSession<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Gracefully ignore storage quota / permission errors in constrained environments
  }
}

/**
 * Removes a list of keys from browser sessionStorage.
 * Safely handles SSR and catches runtime storage exceptions.
 *
 * @param keys - Array of sessionStorage keys to remove.
 * @example
 *   clearSession(['legalsaathi:summary', 'legalsaathi:clauses']);
 * @alignsWith Problem Statement: "Clearing stale legal analysis when documents change"
 */
export function clearSession(keys: string[]): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    for (const key of keys) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Gracefully ignore storage cleanup exceptions
  }
}
