import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  refreshTokens,
  extractBearerToken,
  AuthError,
} from "@/lib/auth/jwt";
import type { JwtPayload } from "@/lib/auth/jwt";

const TEST_SECRET = "test-jwt-secret-key-for-testing";

const samplePayload: JwtPayload = {
  userId: "abc123",
  email: "racer@example.com",
  roles: ["racer", "volunteer"],
};

describe("JWT Authentication Utilities", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_ACCESS_TOKEN_EXPIRY = "15m";
    process.env.JWT_REFRESH_TOKEN_EXPIRY = "7d";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ACCESS_TOKEN_EXPIRY;
    delete process.env.JWT_REFRESH_TOKEN_EXPIRY;
  });

  describe("generateAccessToken", () => {
    it("generates a valid JWT access token", () => {
      const token = generateAccessToken(samplePayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe("abc123");
      expect(decoded.email).toBe("racer@example.com");
      expect(decoded.roles).toEqual(["racer", "volunteer"]);
    });

    it("throws AuthError when JWT_SECRET is missing", () => {
      delete process.env.JWT_SECRET;
      expect(() => generateAccessToken(samplePayload)).toThrow(AuthError);
      expect(() => generateAccessToken(samplePayload)).toThrow(
        "JWT_SECRET is not configured"
      );
    });
  });

  describe("generateRefreshToken", () => {
    it("generates a valid JWT refresh token", () => {
      const token = generateRefreshToken(samplePayload);
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe("abc123");
      expect(decoded.email).toBe("racer@example.com");
    });
  });

  describe("generateTokenPair", () => {
    it("returns both access and refresh tokens", () => {
      const pair = generateTokenPair(samplePayload);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });

    it("generates tokens with different expiration times", () => {
      const pair = generateTokenPair(samplePayload);

      const accessDecoded = jwt.decode(pair.accessToken) as Record<string, number>;
      const refreshDecoded = jwt.decode(pair.refreshToken) as Record<string, number>;

      // Refresh token should expire later than access token
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe("verifyToken", () => {
    it("returns decoded payload for a valid token", () => {
      const token = generateAccessToken(samplePayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe("abc123");
      expect(decoded.email).toBe("racer@example.com");
      expect(decoded.roles).toEqual(["racer", "volunteer"]);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it("throws AuthError with TOKEN_EXPIRED for expired tokens", () => {
      const token = jwt.sign(samplePayload, TEST_SECRET, { expiresIn: "0s" });

      try {
        verifyToken(token);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe("TOKEN_EXPIRED");
      }
    });

    it("throws AuthError with INVALID_TOKEN for malformed tokens", () => {
      try {
        verifyToken("not-a-valid-token");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe("INVALID_TOKEN");
      }
    });

    it("throws AuthError with INVALID_TOKEN for tokens signed with wrong secret", () => {
      const token = jwt.sign(samplePayload, "wrong-secret", {
        expiresIn: "15m",
      });

      try {
        verifyToken(token);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe("INVALID_TOKEN");
      }
    });
  });

  describe("refreshTokens", () => {
    it("issues a new token pair from a valid refresh token", () => {
      const refreshToken = generateRefreshToken(samplePayload);
      const newPair = refreshTokens(refreshToken);

      expect(newPair.accessToken).toBeDefined();
      expect(newPair.refreshToken).toBeDefined();

      const decoded = verifyToken(newPair.accessToken);
      expect(decoded.userId).toBe("abc123");
      expect(decoded.email).toBe("racer@example.com");
      expect(decoded.roles).toEqual(["racer", "volunteer"]);
    });

    it("throws AuthError for an invalid refresh token", () => {
      expect(() => refreshTokens("invalid-token")).toThrow(AuthError);
    });
  });

  describe("extractBearerToken", () => {
    it("extracts token from a valid Bearer header", () => {
      const token = extractBearerToken("Bearer abc123token");
      expect(token).toBe("abc123token");
    });

    it("returns null for null header", () => {
      expect(extractBearerToken(null)).toBeNull();
    });

    it("returns null for undefined header", () => {
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractBearerToken("")).toBeNull();
    });

    it("returns null for non-Bearer scheme", () => {
      expect(extractBearerToken("Basic abc123")).toBeNull();
    });

    it("returns null for malformed header (no space)", () => {
      expect(extractBearerToken("Bearerabc123")).toBeNull();
    });

    it("returns null for header with extra parts", () => {
      expect(extractBearerToken("Bearer abc 123")).toBeNull();
    });
  });
});
