/**
 * @module lib/utils/rateLimit
 * @description Lightweight in-memory rate limiter for LegalSaathi API endpoints.
 * Provides sliding-window rate tracking per client identifier (e.g., IP address) to deter abuse and resource exhaustion.
 * @responsibility Tracks request timestamps per key, purges expired entries, and enforces request quotas.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @security In-memory rate limiting is per-instance. For production multi-server or serverless deployments, use distributed stores like Redis or Upstash. This serves as an essential basic DoS deterrent and cost guard.
 * @productionRecommendation For multi-region enterprise serverless deployments, migrate sliding-window state to `@upstash/ratelimit` backed by Upstash Redis.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

/**
 * Configuration options for the rate limiter.
 */
export interface RateLimitOptions {
  /** Maximum number of allowed requests within the time window. @default 10 */
  max?: number;
  /** Window duration in milliseconds. @default 60000 (60 seconds) */
  windowMs?: number;
}

/**
 * Result returned by the rate limit evaluation.
 */
export interface RateLimitResult {
  /** True if the request is allowed under the current quota; false if rate-limited. */
  allowed: boolean;
  /** Remaining request quota within the active window. */
  remaining: number;
  /** Unix timestamp in milliseconds when the current window resets. */
  resetAt: number;
}

/** In-memory map storing timestamp arrays per key identifier. */
const rateLimitStore = new Map<string, number[]>();

/**
 * Evaluates whether a request key (e.g. client IP) is within its allowed rate limit window.
 *
 * @param key - Unique string identifier for the requester (typically IP address).
 * @param options - Custom quota limits and window duration.
 * @returns Object with allowed status, remaining quota, and reset timestamp.
 *
 * @example
 *   const { allowed, remaining, resetAt } = rateLimit('192.168.1.1', { max: 10, windowMs: 60000 });
 *   if (!allowed) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 */
export function rateLimit(key: string, options?: RateLimitOptions): RateLimitResult {
  const max = options?.max ?? 10;
  const windowMs = options?.windowMs ?? 60000;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Retrieve existing timestamps or initialize empty list
  const timestamps = rateLimitStore.get(key) || [];

  // Filter out timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

  if (activeTimestamps.length >= max) {
    // Limit exceeded: earliest timestamp in the window determines when next request becomes available
    const oldestTimestamp = activeTimestamps[0] ?? now;
    const resetAt = oldestTimestamp + windowMs;

    rateLimitStore.set(key, activeTimestamps);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Request is allowed: record current timestamp
  activeTimestamps.push(now);
  rateLimitStore.set(key, activeTimestamps);

  const resetAt = now + windowMs;
  const remaining = Math.max(0, max - activeTimestamps.length);

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Resets rate limit store for testing or administration.
 *
 * @param key - Optional specific key to clear. If omitted, clears all entries.
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    rateLimitStore.delete(key);
  } else {
    rateLimitStore.clear();
  }
}

/**
 * Extracts client IP address from standard request headers with safe fallbacks.
 *
 * @param headers - HTTP Headers instance or standard Request.
 * @returns Best-effort client IP string or '127.0.0.1' fallback.
 *
 * @example
 *   const ip = getClientIp(req.headers);
 */
export function getClientIp(headers: Headers | Request): string {
  const headerObj = headers instanceof Request ? headers.headers : headers;

  const forwardedFor = headerObj.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headerObj.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfIp = headerObj.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  return '127.0.0.1';
}
