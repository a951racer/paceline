/**
 * Authentication utilities barrel export.
 * Re-exports JWT and password utilities for convenient access.
 */

export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  refreshTokens,
  extractBearerToken,
  AuthError,
} from "./jwt";

export type {
  JwtPayload,
  DecodedToken,
  TokenPair,
} from "./jwt";

export { hashPassword, comparePassword } from "./password";
