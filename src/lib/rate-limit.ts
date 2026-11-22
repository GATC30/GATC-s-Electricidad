import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export interface RateLimitOptions {
  limit?: number;        // Max requests per window
  windowSec?: number;    // Window duration in seconds
  prefix?: string;       // Key prefix
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding window cache fallback (for local dev / offline)
interface WindowRecord {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, WindowRecord>();

// Clean up stale in-memory records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryStore.entries()) {
      if (val.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Checks rate limit for a given client identifier.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { limit = 60, windowSec = 60, prefix = 'ratelimit' } = options;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;

  // Try Vercel KV if available
  const isKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  if (isKvConfigured) {
    try {
      const current = await kv.incr(key);
      if (current === 1) {
        await kv.expire(key, windowSec);
      }
      const ttl = await kv.ttl(key);
      const remaining = Math.max(0, limit - current);
      const reset = now + (ttl > 0 ? ttl * 1000 : windowMs);

      return {
        success: current <= limit,
        limit,
        remaining,
        reset
      };
    } catch (kvError) {
      console.warn('[RateLimit] Vercel KV error, falling back to memory:', kvError);
    }
  }

  // Memory fallback
  const record = memoryStore.get(key);
  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);

  return {
    success: record.count <= limit,
    limit,
    remaining,
    reset: record.resetAt
  };
}

/**
 * Extracts client IP or auth identity from NextRequest.
 */
export function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Helper to enforce rate limiting on API Route handlers.
 * Returns a 429 NextResponse if rate limit is exceeded, or null if allowed.
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(req);
  const result = await checkRateLimit(identifier, options);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset)
        }
      }
    );
  }

  return null;
}
