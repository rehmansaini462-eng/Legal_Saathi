/**
 * @module lib/gemini
 * @description Google Gemini client wrapper for LegalSaathi — handles
 *              model initialization, streaming, and structured JSON output.
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 * @security API key loaded from validated env, never logged, never client-exposed
 */

import { GoogleGenerativeAI, type GenerativeModel, type ModelParams } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '@/lib/env';
import { ERROR_CODES, GEMINI_MODEL, GEMINI_TIMEOUT_MS } from '@/config/constants';
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
}

/**
 * Factory function to retrieve a configured Gemini model instance.
 *
 * @param options - Configuration options such as JSON mode, system instructions, and temperature.
 * @returns Configured GenerativeModel ready for text or stream generation.
 * @example
 *   const model = getGeminiModel({ json: true, systemInstruction: 'Extract legal clauses strictly.' });
 * @alignsWith Problem Statement: "Answering questions based on provided legal documents"
 */
export function getGeminiModel(options?: GeminiModelOptions): GenerativeModel {
  const client = getGenerativeAIClient();
  const modelParams: ModelParams = {
    model: GEMINI_MODEL,
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
 * Generates a streaming plain-text response from Gemini using an async iterable.
 * Ideal for real-time progressive UI rendering and high efficiency.
 *
 * @param prompt - Grounded prompt containing document text and instructions.
 * @param systemInstruction - Optional guardrail instructions constraining generation.
 * @returns AsyncIterable yielding text chunks as they arrive from Gemini.
 * @throws {ApiError} If the API call fails or times out.
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
  const model = getGeminiModel({ streaming: true, systemInstruction });

  try {
    const streamPromise = model.generateContentStream(prompt);
    const result = await Promise.race([streamPromise, createTimeout(GEMINI_TIMEOUT_MS)]);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as ApiError).code === ERROR_CODES.GEMINI_TIMEOUT
    ) {
      throw error;
    }

    const apiError: ApiError = {
      error:
        error instanceof Error
          ? `Gemini generation stream failed: ${error.message}`
          : 'Gemini streaming service encountered an unexpected error.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 502,
    };
    throw apiError;
  }
}

/**
 * Generates structured, schema-validated JSON from Gemini.
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
  const model = getGeminiModel({ json: true, systemInstruction });

  let rawText = '';
  try {
    const generatePromise = model.generateContent(prompt);
    const result = await Promise.race([generatePromise, createTimeout(GEMINI_TIMEOUT_MS)]);
    const response = await result.response;
    rawText = response.text();
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as ApiError).code === ERROR_CODES.GEMINI_TIMEOUT
    ) {
      throw error;
    }

    const apiError: ApiError = {
      error:
        error instanceof Error
          ? `Gemini API call failed: ${error.message}`
          : 'Failed to communicate with Gemini Generative AI service.',
      code: ERROR_CODES.GEMINI_API_ERROR,
      status: 502,
    };
    throw apiError;
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
