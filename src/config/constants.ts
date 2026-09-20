/**
 * Application-wide configuration constants for LegalSaathi.
 */

export const APP_NAME = 'LegalSaathi' as const;

export const APP_TAGLINE = 'Understand your legal documents in plain language' as const;

export const MAX_FILE_SIZE_MB = 10 as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const DISCLAIMER_TEXT =
  'This tool provides legal information, not legal advice. Consult a qualified lawyer for your specific situation.' as const;
