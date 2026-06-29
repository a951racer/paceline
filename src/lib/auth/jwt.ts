/**
 * JWT authentication utilities for token generation, verification, and refresh.
 * Uses jsonwebtoken for JWT operations with configurable expiration times.
 */

import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import type { StringValue } from "ms";
import type { Role, AdminScope } from "@/types";

/** JWT token payload containing user identity and roles */
export interface JwtPayload {
  userId: string;
  email: string;
  roles: Role[];
  adminScope?: AdminScope;
}

/** Decoded JWT payload including standard JWT claims */
export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
}

/** Token pair returned after successful authentication */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Custom error class for authentication failures */
export class AuthError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * Returns the JWT secret from environment variables.
 * Throws if not configured.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthError(
      "JWT_SECRET is not configured",
      "MISSING_JWT_SECRET"
    );
  }
  return secret;
}

/**
 * Returns the access token expiry from environment variables.
 * Defaults to "15m" if not set.
 */
function getAccessTokenExpiry(): StringValue | number {
  return (process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m") as StringValue;
}

/**
 * Returns the refresh token expiry from environment variables.
 * Defaults to "7d" if not set.
 */
function getRefreshTokenExpiry(): StringValue | number {
  return (process.env.JWT_REFRESH_TOKEN_EXPIRY || "7d") as StringValue;
}

/**
 * Generates an access token for the given user payload.
 * Access tokens are short-lived (default 15 minutes).
 */
export function generateAccessToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: getAccessTokenExpiry(),
  });
}

/**
 * Generates a refresh token for the given user payload.
 * Refresh tokens are longer-lived (default 7 days).
 */
export function generateRefreshToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: getRefreshTokenExpiry(),
  });
}

/**
 * Generates both access and refresh tokens for a user.
 * Typically called after successful login or registration.
 */
export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws AuthError with descriptive codes for different failure types:
 * - TOKEN_EXPIRED: Token has passed its expiration time
 * - INVALID_TOKEN: Token is malformed or signature is invalid
 */
export function verifyToken(token: string): DecodedToken {
  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;
    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AuthError("Token has expired", "TOKEN_EXPIRED");
    }
    if (error instanceof JsonWebTokenError) {
      throw new AuthError("Invalid token", "INVALID_TOKEN");
    }
    throw new AuthError("Token verification failed", "INVALID_TOKEN");
  }
}

/**
 * Refreshes an expired access token using a valid refresh token.
 * Verifies the refresh token and issues a new token pair.
 * Throws AuthError if the refresh token is invalid or expired.
 */
export function refreshTokens(refreshToken: string): TokenPair {
  const decoded = verifyToken(refreshToken);

  const payload: JwtPayload = {
    userId: decoded.userId,
    email: decoded.email,
    roles: decoded.roles,
    adminScope: decoded.adminScope,
  };

  return generateTokenPair(payload);
}

/**
 * Extracts a Bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(
  authorizationHeader: string | null | undefined
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const parts = authorizationHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
