/**
 * Unit tests for environment variable validation (src/lib/env.ts).
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

describe("env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://localhost:27017/bike-racing-league",
    TIMESCALEDB_HOST: "localhost",
    TIMESCALEDB_PORT: "5432",
    TIMESCALEDB_DATABASE: "bike_racing_league",
    TIMESCALEDB_USER: "postgres",
    TIMESCALEDB_PASSWORD: "password",
    DATABASE_URL: "postgresql://postgres:password@localhost:5432/bike_racing_league",
  };

  it("should validate correct environment variables", async () => {
    Object.assign(process.env, validEnv);
    const { env } = await import("@/lib/env");
    expect(env.MONGODB_URI).toBe(validEnv.MONGODB_URI);
    expect(env.TIMESCALEDB_HOST).toBe("localhost");
    expect(env.TIMESCALEDB_PORT).toBe(5432);
    expect(env.TIMESCALEDB_DATABASE).toBe("bike_racing_league");
    expect(env.TIMESCALEDB_USER).toBe("postgres");
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it("should throw when MONGODB_URI is missing", async () => {
    const { MONGODB_URI, ...envWithoutMongo } = validEnv;
    Object.assign(process.env, envWithoutMongo);
    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should throw when MONGODB_URI has invalid prefix", async () => {
    Object.assign(process.env, {
      ...validEnv,
      MONGODB_URI: "http://localhost:27017/db",
    });
    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should throw when DATABASE_URL has invalid prefix", async () => {
    Object.assign(process.env, {
      ...validEnv,
      DATABASE_URL: "mysql://localhost/db",
    });
    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should throw when TIMESCALEDB_HOST is missing", async () => {
    const { TIMESCALEDB_HOST, ...envWithoutHost } = validEnv;
    Object.assign(process.env, envWithoutHost);
    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should accept mongodb+srv:// URIs", async () => {
    Object.assign(process.env, {
      ...validEnv,
      MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/db",
    });
    const { env } = await import("@/lib/env");
    expect(env.MONGODB_URI).toBe(
      "mongodb+srv://user:pass@cluster.mongodb.net/db"
    );
  });

  it("should accept postgres:// URIs for DATABASE_URL", async () => {
    Object.assign(process.env, {
      ...validEnv,
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    });
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe("postgres://user:pass@localhost:5432/db");
  });

  it("should default TIMESCALEDB_PORT to 5432 when not provided", async () => {
    const { TIMESCALEDB_PORT, ...envWithoutPort } = validEnv;
    Object.assign(process.env, envWithoutPort);
    const { env } = await import("@/lib/env");
    expect(env.TIMESCALEDB_PORT).toBe(5432);
  });

  it("should accept valid NODE_ENV values", async () => {
    Object.assign(process.env, { ...validEnv, NODE_ENV: "test" });
    const { env } = await import("@/lib/env");
    expect(env.NODE_ENV).toBe("test");
  });
});
