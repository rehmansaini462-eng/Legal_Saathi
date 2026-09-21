/**
 * @module lib/gemini
 * @description Google Gemini client wrapper for LegalSaathi — handles
 *              model initialization, streaming, resilient retries, model fallback chain, and structured JSON output.
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @security API key loaded from validated env, never logged, never client-exposed
 */

import { GoogleGenerativeAI, type GenerativeModel, type ModelParams } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '@/lib/env';
import { ERROR_CODES, GEMINI_MODEL, GEMINI_MODELS, GEMINI_TIMEOUT_MS } from '@/config/constants';
import type { ApiError } from '@/types/legal';

/**
 * Singleton Google Generative AI client instance configured with the validated environment API key.
 * @security Never log or expose this client instance or its key to client components.
 */
let generativeAIClient: GoogleGenerativeAI | null = null;

/**
 * Retrieves or lazily creates the initialized GoogleGenerativeAI client instance.
 *
 * @returns Initialized GoogleGenerativeAI instance.
 * @security Loads API key strictly from validated server-side environment variables.
 * @example
 *   const client = getGenerativeAIClient();
 */
export function getGenerativeAIClient(): GoogleGenerativeAI {
  if (!generativeAIClient) {
    generativeAIClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return generativeAIClient;
}

/**
 * Options for configuring the Gemini model instance.
 */
export interface GeminiModelOptions {
  streaming?: boolean;
  json?: boolean;
  systemInstruction?: string;
  temperature?: number;
  modelName?: string;
}

/**
 * Factory function to retrieve a configured Gemini model instance.
 *
 * @param options - Configuration options such as JSON mode, system instructions, temperature, and model name.
 * @returns Configured GenerativeModel ready for text or stream generation.
 * @example
 *   const model = getGeminiModel({ json: true, systemInstruction: 'Extract legal clauses strictly.' });
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 */
export function getGeminiModel(options?: GeminiModelOptions): GenerativeModel {
  const client = getGenerativeAIClient();
  const modelName = options?.modelName ?? GEMINI_MODEL;
  const modelParams: ModelParams = {
    model: modelName,
  };

  if (options?.systemInstruction) {
    modelParams.systemInstruction = options.systemInstruction;
  }

  if (options?.json) {
    modelParams.generationConfig = {
      responseMimeType: 'application/json',
      temperature: options.temperature ?? 0.1,
    };
  } else if (options?.temperature !== undefined) {
    modelParams.generationConfig = {
      temperature: options.temperature,
    };
  }

  return client.getGenerativeModel(modelParams);
}

/**
 * Options for configuring the exponential backoff retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts before throwing error (default: 3). */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 500). */
  baseDelayMs?: number;
}

/**
 * Determines whether an error is transient and eligible for retry.
 *
 * @param error - The error thrown by an upstream operation.
 * @returns True if error is transient (503, 429, stream parse error), false for 4xx auth/validation errors.
 * @alignsWith "Robust error handling for reliable legal document analysis"
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  let message = '';
  let status: number | undefined;

  if (typeof error === 'object' && error !== null) {
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      status = (error as { status: number }).status;
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      message = (error as { message: string }).message;
    } else if ('error' in error && typeof (error as { error: unknown }).error === 'string') {
      message = (error as { error: string }).error;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  // Explicitly do NOT retry on 4xx auth/validation errors (400, 401, 403, 404)
  if (status && [400, 401, 403, 404].includes(status)) {
    return false;
  }

  const has4xx =
    /\b(400|401|403|404)\b/i.test(message) ||
    /bad request/i.test(message) ||
    /unauthorized/i.test(message) ||
    /forbidden/i.test(message) ||
    /not found/i.test(message);

  const hasTransientCode =
    message.includes('503') || message.includes('429') || status === 503 || status === 429;

  if (has4xx && !hasTransientCode) {
    return false;
  }

  const retryKeywords = [
    '503',
    'service unavailable',
    '429',
    'too many requests',
    'failed to parse stream',
    'high demand',
    'overloaded',
    'resource exhausted',
    'temporarily unavailable',
  ];

  const lowerMsg = message.toLowerCase();
  return hasTransientCode || retryKeywords.some((kw) => lowerMsg.includes(kw));
}

/**
 * Executes an asynchronous function with exponential backoff retries for transient upstream failures.
 *
 * @param fn - The asynchronous operation to execute.
 * @param options - Configuration options for maxRetries and baseDelayMs.
 * @returns The resolved value of the wrapped asynchronous function.
 * @throws The last encountered error if all retry attempts are exhausted or a non-retryable error occurs.
 * @example
 *   const result = await withRetry(() => model.generateContent(prompt), { maxRetries: 3, baseDelayMs: 500 });
 * @alignsWith "Robust error handling for reliable legal document analysis"
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt < maxRetries && isRetryableError(error)) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Normalizes unknown errors into typed ApiError objects, mapping 503s to GEMINI_HIGH_DEMAND.
 *
 * @param error - The raw caught error.
 * @param defaultMessage - Fallback error description.
 * @returns Normalized ApiError instance.
 */
function toApiError(error: unknown, defaultMessage: string): ApiError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'status' in error &&
    'error' in error
  ) {
    return error as ApiError;
  }

  const errorMessage = error instanceof Error ? error.message : String(error ?? defaultMessage);
  const lowerMsg = errorMessage.toLowerCase();

  if (
    errorMessage.includes('503') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('service unavailable')
  ) {
    return {
      error: 'Our AI service is experiencing high demand. Please try again in 30 seconds.',
      code: ERROR_CODES.GEMINI_HIGH_DEMAND,
      status: 503,
    };
  }

  return {
    error: error instanceof Error ? `${defaultMessage}: ${error.message}` : defaultMessage,
    code: ERROR_CODES.GEMINI_API_ERROR,
    status: 502,
  };
}

/**
 * Creates a timeout promise that rejects with an ApiError after the specified duration.
 *
 * @param ms - Milliseconds to wait before timing out.
 * @returns Promise that rejects with a GEMINI_TIMEOUT ApiError.
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const timeoutError: ApiError = {
        error: `Gemini API request timed out after ${ms / 1000}s.`,
        code: ERROR_CODES.GEMINI_TIMEOUT,
        status: 504,
      };
      reject(timeoutError);
    }, ms);
  });
}

/**
 * Strips potential markdown code block fences (e.g. ```json ... ```) from model output.
 *
 * @param raw - Raw string output from the LLM.
 * @returns Cleaned JSON string.
 */
export function cleanJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

/**
 * Generates a non-streaming plain-text response from Gemini with automatic retry and model fallback.
 * Serves as a resilient fallback when streaming fails or for direct text generation.
 *
 * @param prompt - Grounded prompt containing document text and instructions.
 * @param systemInstruction - Optional guardrail instructions constraining generation.
 * @returns Generated plain text response from Gemini.
 * @throws {ApiError} If all models and retries fail or time out.
 * @example
 *   const summary = await generateText('Summarize this contract: ...');
 * @alignsWith "Robust error handling for reliable legal document analysis"
 * @security Strictly relies on grounded prompt inputs and enforces execution timeout bounds.
 */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    const model = getGeminiModel({ systemInstruction, modelName });
    try {
      const responseText = await withRetry(async () => {
        const generatePromise = model.generateContent(prompt);
        const result = await Promise.race([generatePromise, createTimeout(GEMINI_TIMEOUT_MS)]);
        const response = await result.response;
        return response.text();
      });
      return responseText;
    } catch (error: unknown) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isModelFallbackEligible =
        errorMsg.includes('404') ||
        errorMsg.includes('503') ||
        errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('service unavailable') ||
        errorMsg.toLowerCase().includes('high demand');

      if (!isModelFallbackEligible) {
        throw toApiError(error, 'Gemini text generation failed');
      }
    }
  }

  throw toApiError(lastError, 'Gemini text generation failed across all models');
}

/**
 * Generates a streaming plain-text response from Gemini using an async iterable.
 * Features retry on initial connection, model fallback chain, and per-chunk parse tolerance.
 *
 * @param prompt - Grounded prompt containing document text and instructions.
 * @param systemInstruction - Optional guardrail instructions constraining generation.
 * @returns AsyncIterable yielding text chunks as they arrive from Gemini.
 * @throws {ApiError} If the stream creation fails across all models and retries or times out.
 * @example
 *   for await (const chunk of generateStream('Summarize this contract: ...')) {
 *     process.stdout.write(chunk);
 *   }
 * @alignsWith Problem Statement: "Generating summaries, checklists, or other actionable outputs"
 * @security Strictly relies on grounded prompt inputs and enforces execution timeout bounds.
 */
export async function* generateStream(
  prompt: string,
  systemInstruction?: string
): AsyncIterable<string> {
  let streamResult: Awaited<ReturnType<GenerativeModel['generateContentStream']>> | null = null;
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    const model = getGeminiModel({ streaming: true, systemInstruction, modelName });
    try {
      streamResult = await withRetry(async () => {
        const streamPromise = model.generateContentStream(prompt);
        return await Promise.race([streamPromise, createTimeout(GEMINI_TIMEOUT_MS)]);
      });
      break;
    } catch (error: unknown) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isModelFallbackEligible =
        errorMsg.includes('404') ||
        errorMsg.includes('503') ||
        errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('service unavailable') ||
        errorMsg.toLowerCase().includes('high demand');

      if (!isModelFallbackEligible) {
        throw toApiError(error, 'Gemini generation stream failed');
      }
    }
  }

  if (!streamResult) {
    throw toApiError(lastError, 'Gemini generation stream failed across all models');
  }

  try {
    for await (const chunk of streamResult.stream) {
      try {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      } catch (chunkError) {
        console.warn(
          'Warning: Failed to parse stream chunk, continuing with next chunk...',
          chunkError
        );
      }
    }
  } catch (error: unknown) {
    throw toApiError(error, 'Gemini streaming transmission failed');
  }
}

/**
 * Generates structured, schema-validated JSON from Gemini with retry and model fallback resilience.
 * Enforces strict grounding and validates the output against a provided Zod schema.
 *
 * @param prompt - Grounded prompt requesting structured JSON output.
 * @param schema - Zod schema defining the expected output shape.
 * @param systemInstruction - Optional safety guardrails and anti-hallucination instructions.
 * @returns Strongly-typed, validated object matching schema T.
 * @throws {ApiError} If the API fails, times out, or output violates the Zod schema.
 * @example
 *   const data = await generateJSON(prompt, ClausesResponseSchema);
 * @alignsWith Problem Statement: "Highlighting important clauses, obligations, risks, or inconsistencies"
 * @security Output is validated against Zod schema to prevent malformed or dangerous payloads.
 */
export async function generateJSON<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  systemInstruction?: string
): Promise<T> {
  let rawText = '';
  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    const model = getGeminiModel({ json: true, systemInstruction, modelName });
    try {
      rawText = await withRetry(async () => {
        const generatePromise = model.generateContent(prompt);
        const result = await Promise.race([generatePromise, createTimeout(GEMINI_TIMEOUT_MS)]);
        const response = await result.response;
        return response.text();
      });
      break;
    } catch (error: unknown) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isModelFallbackEligible =
        errorMsg.includes('404') ||
        errorMsg.includes('503') ||
        errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('service unavailable') ||
        errorMsg.toLowerCase().includes('high demand');

      if (!isModelFallbackEligible) {
        throw toApiError(error, 'Gemini API call failed');
      }
    }
  }

  if (!rawText && lastError) {
    throw toApiError(lastError, 'Gemini API call failed across all models');
  }

  // Parse and validate with Zod
  try {
    const cleanedText = cleanJsonFence(rawText);
    const parsedJson = JSON.parse(cleanedText);
    const validated = schema.safeParse(parsedJson);

    if (!validated.success) {
      const details = validated.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      const parseError: ApiError = {
        error: `LLM response failed schema validation: ${details}`,
        code: ERROR_CODES.GEMINI_PARSE_ERROR,
        status: 422,
      };
      throw parseError;
    }

    return validated.data;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as ApiError).code === ERROR_CODES.GEMINI_PARSE_ERROR
    ) {
      throw error;
    }

    const parseError: ApiError = {
      error:
        error instanceof Error
          ? `Failed to parse Gemini JSON output: ${error.message}`
          : 'Invalid JSON received from Gemini model.',
      code: ERROR_CODES.GEMINI_PARSE_ERROR,
      status: 422,
    };
    throw parseError;
  }
}
