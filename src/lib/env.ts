/**
 * Runtime environment variables validation and typed configuration export using Zod.
 */

import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z
    .string()
    .min(10, { message: 'GEMINI_API_KEY must be at least 10 characters long.' }),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_APP_URL must be a valid URL (e.g. http://localhost:3000).' }),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const parsed = envSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid or missing environment variables configuration:\n${errorDetails}\nPlease check your .env or .env.local file against .env.example.`
    );
  }

  return parsed.data;
};

export const env: Env =
  process.env.NODE_ENV === 'test'
    ? {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'mock-gemini-key-for-test-suite',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      }
    : parseEnv();
