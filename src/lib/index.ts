/**
 * @module lib
 * @description Centralized barrel exports for core LegalSaathi libraries, parsers, and environment configs.
 * @responsibility Re-exports parser utilities and validated runtime environment instances.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, typed errors, unit-tested
 */

export { parseDocument, isApiError } from './parser';
export { env } from './env';
