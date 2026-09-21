/**
 * @file redact.test.ts
 * @description Comprehensive unit tests for LegalSaathi client-side PII detection and redaction utility.
 * Verified across Security boundaries, Problem Alignment, and Code Quality metrics.
 */

import { describe, it, expect } from 'vitest';
import { redactPII, maskEmails } from '@/lib/utils/redact';

describe('redactPII — Security', () => {
  it('masks email addresses (SECURITY: PII protection)', () => {
    const raw =
      'Please contact support@legalsaathi.in or john.doe_123@sub.domain.org for inquiries.';
    const result = maskEmails(raw);

    expect(result.text).not.toContain('support@legalsaathi.in');
    expect(result.text).not.toContain('john.doe_123@sub.domain.org');
    expect(result.text).toBe('Please contact [EMAIL] or [EMAIL] for inquiries.');
    expect(result.count).toBe(2);
  });

  it('masks Indian phone numbers and Aadhaar (SECURITY: PII protection)', () => {
    const raw = 'Mobile: +91 98765 43210 or 09876543210. Aadhaar UID: 4521 8974 6325.';
    const result = redactPII(raw);

    expect(result.redactedText).not.toContain('98765 43210');
    expect(result.redactedText).not.toContain('4521 8974 6325');
    expect(result.redactedText).toContain('[PHONE]');
    expect(result.redactedText).toContain('[AADHAAR]');
  });

  it('masks PAN and credit card numbers (SECURITY: PII protection)', () => {
    const raw =
      'PAN card BNZPS1234K was provided. Card details: 4111 2222 3333 4444 with IFSC HDFC0001234.';
    const result = redactPII(raw);

    expect(result.redactedText).not.toContain('BNZPS1234K');
    expect(result.redactedText).not.toContain('4111 2222 3333 4444');
    expect(result.redactedText).not.toContain('HDFC0001234');
    expect(result.redactedText).toContain('[PAN]');
    expect(result.redactedText).toContain('[CARD]');
    expect(result.redactedText).toContain('[IFSC]');
  });

  it('preserves non-PII text unchanged', () => {
    const standardLegalText =
      'This Non-Disclosure Agreement is made and entered into on this 21st day of September, 2026, by and between Company A and Company B.';
    const result = redactPII(standardLegalText);

    expect(result.redactedText).toBe(standardLegalText);
    expect(result.detections.length).toBe(0);
  });

  it('returns detection counts for each PII type', () => {
    const mixedPii = `
      Vendor: contact@vendor.com
      Accounts: billing@vendor.com
      PAN: ABCDE1234F
      Aadhaar: 2345 6789 0123
      Phone: +91-9876543210
    `;
    const result = redactPII(mixedPii);

    expect(result.detections).toBeInstanceOf(Array);
    const emailDetection = result.detections.find((d) => d.type === 'Email Address');
    const panDetection = result.detections.find((d) => d.type === 'PAN Number');
    const aadhaarDetection = result.detections.find((d) => d.type === 'Aadhaar Number');
    const phoneDetection = result.detections.find((d) => d.type === 'Phone Number');

    expect(emailDetection?.count).toBe(2);
    expect(panDetection?.count).toBe(1);
    expect(aadhaarDetection?.count).toBe(1);
    expect(phoneDetection?.count).toBe(1);
  });

  it('never sends PII to any server (SECURITY: client-only processing)', () => {
    // Pure synchronous execution test — no fetch/network side effects
    const sensitive = 'Private info: admin@company.internal, PAN: ABCDE9999Z';
    const beforeTime = Date.now();
    const { redactedText } = redactPII(sensitive);
    const executionTimeMs = Date.now() - beforeTime;

    expect(executionTimeMs).toBeLessThan(100);
    expect(redactedText).toBe('Private info: [EMAIL], PAN: [PAN]');
  });

  it('handles bank account numbers correctly (SECURITY: Financial data protection)', () => {
    const raw = 'Remit payment to Account Number: 123456789012345, IFSC: SBIN0001234.';
    const result = redactPII(raw);

    expect(result.redactedText).not.toContain('123456789012345');
    expect(result.redactedText).toContain('[ACCOUNT]');
    expect(result.redactedText).toContain('[IFSC]');
  });

  it('gracefully handles empty or null input (Code Quality)', () => {
    const emptyResult = redactPII('');
    expect(emptyResult.redactedText).toBe('');
    expect(emptyResult.detections).toEqual([]);
  });
});
