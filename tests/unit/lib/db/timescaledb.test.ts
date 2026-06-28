/**
 * Unit tests for TimescaleDB connection utility (src/lib/db/timescaledb.ts).
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock pg module
const mockQuery = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockConnect = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockEnd = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockOn = jest.fn<(...args: unknown[]) => unknown>();
const mockRelease = jest.fn<(...args: unknown[]) => unknown>();

jest.mock("pg", () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
      on: mockOn,
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    })),
  };
});

describe("TimescaleDB connection utility", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TIMESCALEDB_HOST = "localhost";
    process.env.TIMESCALEDB_PORT = "5432";
    process.env.TIMESCALEDB_DATABASE = "test_db";
    process.env.TIMESCALEDB_USER = "postgres";
    process.env.TIMESCALEDB_PASSWORD = "password";

    // Clear the global cache
    const globalAny = globalThis as typeof globalThis & {
      __timescalePool?: unknown;
    };
    delete globalAny.__timescalePool;

    mockQuery.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();
    mockOn.mockReset();
    mockRelease.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should throw if required environment variables are missing", async () => {
    delete process.env.TIMESCALEDB_HOST;
    delete process.env.TIMESCALEDB_DATABASE;
    delete process.env.TIMESCALEDB_USER;

    const { getTimescalePool } = await import("@/lib/db/timescaledb");
    expect(() => getTimescalePool()).toThrow(
      "TimescaleDB connection configuration is incomplete"
    );
  });

  it("should create a pool with environment config", async () => {
    const { getTimescalePool } = await import("@/lib/db/timescaledb");
    const pool = getTimescalePool();

    expect(pool).toBeDefined();
    expect(pool.on).toBeDefined();
  });

  it("should return cached pool on subsequent calls", async () => {
    const { getTimescalePool } = await import("@/lib/db/timescaledb");
    const first = getTimescalePool();
    const second = getTimescalePool();

    expect(first).toBe(second);
  });

  it("should execute queries with retry logic", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const { getTimescalePool, queryWithRetry } = await import(
      "@/lib/db/timescaledb"
    );
    getTimescalePool(); // Initialize pool

    const result = await queryWithRetry("SELECT 1 as id");
    expect(result.rows[0]).toEqual({ id: 1 });
  });

  it("should return pool stats", async () => {
    const { getTimescalePool, getPoolStats } = await import(
      "@/lib/db/timescaledb"
    );
    getTimescalePool(); // Initialize pool

    const stats = getPoolStats();
    expect(stats).toEqual({
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    });
  });

  it("should disconnect and clear the pool", async () => {
    mockEnd.mockResolvedValue(undefined);

    const { getTimescalePool, disconnectTimescaleDB } = await import(
      "@/lib/db/timescaledb"
    );
    getTimescalePool(); // Initialize pool

    await disconnectTimescaleDB();
    expect(mockEnd).toHaveBeenCalled();
  });

  it("should support custom pool configuration", async () => {
    const { Pool } = await import("pg");
    const { getTimescalePool } = await import("@/lib/db/timescaledb");

    getTimescalePool({
      host: "custom-host",
      port: 5433,
      database: "custom_db",
      user: "custom_user",
      password: "custom_pass",
      max: 30,
    });

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "custom-host",
        port: 5433,
        database: "custom_db",
        user: "custom_user",
        password: "custom_pass",
        max: 30,
      })
    );
  });

  it("should support transactions with withTransaction helper", async () => {
    const mockClient = {
      query: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    const { getTimescalePool, withTransaction } = await import(
      "@/lib/db/timescaledb"
    );
    getTimescalePool(); // Initialize pool

    const result = await withTransaction(async (client) => {
      await client.query("INSERT INTO test VALUES (1)");
      return "done";
    });

    expect(result).toBe("done");
    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith("INSERT INTO test VALUES (1)");
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    expect(mockRelease).toHaveBeenCalled();
  });

  it("should rollback transaction on error", async () => {
    const mockClient = {
      query: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(
        (...args: unknown[]) => {
          const sql = args[0] as string;
          if (sql === "INSERT INTO test VALUES (1)") {
            return Promise.reject(new Error("insert failed"));
          }
          return Promise.resolve(undefined);
        }
      ),
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);

    const { getTimescalePool, withTransaction } = await import(
      "@/lib/db/timescaledb"
    );
    getTimescalePool(); // Initialize pool

    await expect(
      withTransaction(async (client) => {
        await client.query("INSERT INTO test VALUES (1)");
      })
    ).rejects.toThrow("insert failed");

    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockRelease).toHaveBeenCalled();
  });
});
