/**
 * Middleware barrel exports.
 * Middleware functions for authentication, authorization, security, logging, and rate limiting.
 */

export {
  applySecurityHeaders,
  withSecurityHeaders,
  getSecurityHeaders,
} from "./security-headers";

export { logRequest, withLogging } from "./http-logger";

export {
  withRateLimit,
  getClientIp,
  rateLimitStore,
  publicRateLimitConfig,
  adminRateLimitConfig,
} from "./rate-limit";

export type { RateLimitType, RateLimitOptions } from "./rate-limit";

export { withAuth, withAdmin } from "./auth";

export type { AuthContext, AuthenticatedHandler } from "./auth";

export { withLeagueAuth } from "./league-auth";

export type { LeagueAuthContext, LeagueAuthorizedHandler } from "./league-auth";
