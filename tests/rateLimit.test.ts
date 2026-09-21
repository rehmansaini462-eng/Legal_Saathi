/**
 * @module tests/rateLimit.test
 * @description Unit tests for in-memory sliding window rate limiter ensuring DoS prevention and quota management.
 * @alignsWith Problem Statement: "Security and reliability for legal document processing"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, resetRateLimit, getClientIp } from '@/lib/utils/rateLimit';

describe('rateLimit — Security & Performance Quota Tests', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.useRealTimers();
  });

  it('allows requests under limit (SECURITY: basic DoS deterrence)', () => {
    const key = 'test-ip-1';
    const res1 = rateLimit(key, { max: 3, windowMs: 1000 });
    const res2 = rateLimit(key, { max: 3, windowMs: 1000 });

    expect(res1.allowed).toBe(true);
    expect(res2.allowed).toBe(true);
  });

  it('blocks requests over limit (SECURITY: rate limiting enforcement)', () => {
    const key = 'test-ip-2';
    // Consume quota of 2
    rateLimit(key, { max: 2, windowMs: 1000 });
    rateLimit(key, { max: 2, windowMs: 1000 });

    // 3rd attempt exceeds quota
    const blockedRes = rateLimit(key, { max: 2, windowMs: 1000 });

    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetAt).toBeGreaterThan(Date.now());
  });

  it('resets after window expires (RELIABILITY: sliding window expiration)', () => {
    vi.useFakeTimers();
    const key = 'test-ip-3';

    // Consume all 2 slots
    rateLimit(key, { max: 2, windowMs: 1000 });
    rateLimit(key, { max: 2, windowMs: 1000 });

    // Confirm blocked
    expect(rateLimit(key, { max: 2, windowMs: 1000 }).allowed).toBe(false);

    // Fast-forward past the 1000ms window
    vi.advanceTimersByTime(1100);

    // Should now be allowed again
    const afterReset = rateLimit(key, { max: 2, windowMs: 1000 });
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it('tracks separate keys independently (SECURITY: IP isolation)', () => {
    const keyA = 'ip-user-a';
    const keyB = 'ip-user-b';

    // Consume quota for User A
    rateLimit(keyA, { max: 1, windowMs: 1000 });
    const blockedA = rateLimit(keyA, { max: 1, windowMs: 1000 });
    expect(blockedA.allowed).toBe(false);

    // User B should still have full access
    const allowedB = rateLimit(keyB, { max: 1, windowMs: 1000 });
    expect(allowedB.allowed).toBe(true);
    expect(allowedB.remaining).toBe(0);
  });

  it('returns correct remaining count (EFFICIENCY: quota tracking)', () => {
    const key = 'test-ip-5';
    const max = 5;

    const r1 = rateLimit(key, { max, windowMs: 5000 });
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit(key, { max, windowMs: 5000 });
    expect(r2.remaining).toBe(3);

    const r3 = rateLimit(key, { max, windowMs: 5000 });
    expect(r3.remaining).toBe(2);
  });

  it('extracts client IP from various headers safely', () => {
    const headers1 = new Headers({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18' });
    expect(getClientIp(headers1)).toBe('203.0.113.195');

    const headers2 = new Headers({ 'x-real-ip': '198.51.100.4' });
    expect(getClientIp(headers2)).toBe('198.51.100.4');

    const headers3 = new Headers();
    expect(getClientIp(headers3)).toBe('127.0.0.1');
  });
});
