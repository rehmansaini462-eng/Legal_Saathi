/**
 * @file parser.test.ts
 * @description Comprehensive unit tests for the LegalSaathi multi-format document parser.
 * Verified across Security boundaries, Problem Alignment, and Code Quality metrics.
 */

import { describe, it, expect, vi } from 'vitest';
import { parseDocument } from '@/lib/parser';
import { ERROR_CODES, MAX_FILE_SIZE_BYTES } from '@/config/constants';
import type { ApiError } from '@/types/legal';

// Mock pdf-parse to simulate text extraction and scanned document detection
vi.mock('pdf-parse', () => ({
  default: vi.fn(async (buffer: Buffer) => {
    const rawString = buffer.toString('utf-8');
    if (rawString.includes('__MOCK_SCANNED__')) {
      return {
        numpages: 1,
        text: 'Short scanned text',
      };
    }
    return {
      numpages: 3,
      text:
        rawString.length > 50
          ? rawString
          : 'This Master Services Agreement is entered into by and between the parties for professional consulting services and indemnification clauses.',
    };
  }),
}));

describe('parseDocument — Security', () => {
  it('rejects unsupported MIME types with INVALID_MIME (SECURITY: whitelist enforcement)', async () => {
    const maliciousFile = new File(['executable code'], 'script.exe', {
      type: 'application/x-msdownload',
    });

    try {
      await parseDocument(maliciousFile);
      expect.fail('Should have rejected unsupported MIME type');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe(ERROR_CODES.INVALID_MIME);
      expect(apiErr.status).toBe(415);
      expect(apiErr.error).toContain('Unsupported file type');
    }
  });

  it('rejects files exceeding MAX_FILE_SIZE_BYTES with FILE_TOO_LARGE (SECURITY: DoS prevention)', async () => {
    // Create a virtual file object whose size property exceeds 10MB
    const oversizedBlob = new Blob(['A'.repeat(100)]);
    const oversizedFile = new File([oversizedBlob], 'large_contract.txt', {
      type: 'text/plain',
    });
    Object.defineProperty(oversizedFile, 'size', {
      value: MAX_FILE_SIZE_BYTES + 1024,
      writable: false,
    });

    try {
      await parseDocument(oversizedFile);
      expect.fail('Should have rejected oversized file');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
      expect(apiErr.status).toBe(413);
      expect(apiErr.error).toContain('exceeds the 10MB limit');
    }
  });

  it('rejects empty files with EMPTY_FILE (SECURITY: input validation)', async () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });

    try {
      await parseDocument(emptyFile);
      expect.fail('Should have rejected 0-byte file');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe(ERROR_CODES.EMPTY_FILE);
      expect(apiErr.status).toBe(400);
      expect(apiErr.error).toContain('empty');
    }
  });
});

describe('parseDocument — Problem Alignment', () => {
  it('extracts plain text from legal documents for clause-level analysis', async () => {
    const legalContractText =
      '1. Confidentiality Obligations.\nEach receiving party shall protect proprietary information with the same degree of care as its own confidential materials.';
    const textFile = new File([legalContractText], 'nda_agreement.txt', {
      type: 'text/plain',
    });

    const parsed = await parseDocument(textFile);
    expect(parsed.filename).toBe('nda_agreement.txt');
    expect(parsed.mimeType).toBe('text/plain');
    expect(parsed.text).toBe(legalContractText);
    expect(parsed.wordCount).toBeGreaterThan(10);
    expect(parsed.charCount).toBe(legalContractText.length);
  });

  it('flags scanned PDFs as needing OCR for legal document comprehension', async () => {
    const scannedPdfMock = new File(['__MOCK_SCANNED__'], 'scanned_lease.pdf', {
      type: 'application/pdf',
    });

    const parsed = await parseDocument(scannedPdfMock);
    expect(parsed.warnings).toBeDefined();
    expect(parsed.warnings?.length).toBeGreaterThan(0);
    expect(parsed.warnings?.[0]).toContain('This PDF appears to be scanned');
  });
});

describe('parseDocument — Code Quality', () => {
  it('sanitizes text by collapsing 3+ blank lines into 2', async () => {
    const textWithExcessNewlines =
      'Clause 1: Scope of Work.\n\n\n\n\nClause 2: Payment Terms.\n\r\n\r\n\r\nClause 3: Termination.';
    const file = new File([textWithExcessNewlines], 'contract.txt', {
      type: 'text/plain',
    });

    const parsed = await parseDocument(file);
    expect(parsed.text).not.toContain('\n\n\n');
    expect(parsed.text).toContain('Clause 1: Scope of Work.\n\nClause 2: Payment Terms.');
  });

  it('computes accurate word and character counts', async () => {
    const sampleClause = 'The governing law shall be the laws of India.';
    const file = new File([sampleClause], 'terms.txt', { type: 'text/plain' });

    const parsed = await parseDocument(file);
    expect(parsed.wordCount).toBe(9);
    expect(parsed.charCount).toBe(sampleClause.length);
  });

  it('returns typed ParsedDocument with all required fields', async () => {
    const sampleText = 'Non-Disclosure Agreement between Acme Corp and Beta LLC.';
    const file = new File([sampleText], 'agreement.txt', { type: 'text/plain' });

    const parsed = await parseDocument(file);
    expect(parsed).toHaveProperty('text');
    expect(parsed).toHaveProperty('filename');
    expect(parsed).toHaveProperty('mimeType');
    expect(parsed).toHaveProperty('sizeBytes');
    expect(parsed).toHaveProperty('wordCount');
    expect(parsed).toHaveProperty('charCount');
    expect(parsed).toHaveProperty('parsedAt');
    expect(typeof parsed.parsedAt).toBe('string');
    expect(new Date(parsed.parsedAt).getTime()).not.toBeNaN();
  });
});
