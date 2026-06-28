/**
 * Rate limiting middleware for Next.js API routes.
 *
 * Provides per-IP rate limiting for public endpoints and per-user rate limiting
 * for authenticated admin endpoints. Uses an in-memory sliding window counter
 * (suitable for single-dyno Heroku deployment; swap for Redis-backed store
 * in multi-instance environments).
 *
 * @see Requirements 12.8
 */

import { NextResponse } from "next/server";

// --- Configuration ---

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit configuration for public endpoints (per-IP).
 */
export const publicRateLimitConfig: RateLimitConfig = {
  max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || "100", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || "900000", 10),
};

/**
 * Rate limit configuration for admin endpoints (per-user).
 */
export const adminRateLimitConfig: RateLimitConfig = {
  max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || "200", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || "900000", 10),
};

// --- In-Memory Store ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory store for rate limit counters.
 * In production with multiple dynos, replace with Redis-backed store.
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically clean up expired entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    // Allow the process to exit without waiting for the interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Increment the counter for a key and return the current state.
   */
  increment(
    key: string,
    config: RateLimitConfig
  ): { count: number; remaining: number; resetAt: number; limited: boolean } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      // Start a new window
      const entry: RateLimitEntry = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      this.store.set(key, entry);
      return {
        count: 1,
        remaining: config.max - 1,
        resetAt: entry.resetAt,
        limited: false,
      };
    }

    // Increment within existing window
    existing.count++;
    const limited = existing.count > config.max;
    return {
      count: existing.count,
      remaining: Math.max(0, config.max - existing.count),
      resetAt: existing.resetAt,
      limited,
    };
  }

  /**
   * Remove expired entries from the store.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (useful for testing).
   */
  reset(): void {
    this.store.clear();
  }

  /**
   * Stop the cleanup interval (useful for testing/shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton store instance
export const rateLimitStore = new RateLimitStore();

// --- Utilities ---

/**
 * Extracts the client IP address from the request.
 * Checks standard proxy headers used by Heroku/load balancers.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  // X-Forwarded-For is set by Heroku's router
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (original client)
    return forwarded.split(",")[0].trim();
  }

  // Fallback headers
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Creates a rate-limited 429 response with appropriate headers.
 */
function createRateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new NextResponse(
    JSON.stringify({
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * Applies rate limit headers to a response.
 */
function applyRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  result: { remaining: number; resetAt: number }
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(config.max));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000))
  );
  return response;
}

// --- Middleware Wrappers ---

export type RateLimitType = "public" | "admin";

export interface RateLimitOptions {
  /** Type of rate limiting to apply */
  type: RateLimitType;
  /**
   * Function to extract user ID for per-user rate limiting (admin).
   * If not provided for admin type, falls back to per-IP.
   */
  getUserId?: (request: Request) => string | null;
}

/**
 * Higher-order function that wraps an API route handler with rate limiting.
 *
 * For public endpoints (type: 'public'), rate limiting is applied per-IP.
 * For admin endpoints (type: 'admin'), rate limiting is applied per-user
 * (falling back to per-IP if user ID extraction fails).
 *
 * @example
 * ```ts
 * import { withRateLimit } from '@/middleware/rate-limit';
 *
 * // Public endpoint - per-IP rate limiting
 * export const GET = withRateLimit({ type: 'public' })(async (request) => {
 *   return NextResponse.json({ data: "value" });
 * });
 *
 * // Admin endpoint - per-user rate limiting
 * export const POST = withRateLimit({
 *   type: 'admin',
 *   getUserId: (req) => extractUserIdFromJwt(req),
 * })(async (request) => {
 *   return NextResponse.json({ data: "admin action" });
 * });
 * ```
 */
export function withRateLimit(options: RateLimitOptions) {
  const config =
    options.type === "admin" ? adminRateLimitConfig : publicRateLimitConfig;

  return (
    handler: (request: Request) => Promise<NextResponse> | NextResponse
  ): ((request: Request) => Promise<NextResponse>) => {
    return async (request: Request): Promise<NextResponse> => {
      // Determine the rate limit key
      let key: string;
      if (options.type === "admin" && options.getUserId) {
        const userId = options.getUserId(request);
        key = userId ? `admin:${userId}` : `ip:${getClientIp(request)}`;
      } else {
        key = `ip:${getClientIp(request)}`;
      }

      // Check rate limit
      const result = rateLimitStore.increment(key, config);

      if (result.limited) {
        return createRateLimitResponse(result.resetAt);
      }

      // Execute the handler
      const response = await handler(request);

      // Add rate limit headers to successful response
      return applyRateLimitHeaders(response, config, result);
    };
  };
}
