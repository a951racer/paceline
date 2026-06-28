/**
 * Unit tests for MongoDB connection utility (src/lib/db/mongodb.ts).
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import type mongoose from "mongoose";

// Mock mongoose
jest.mock("mongoose", () => {
  const mockConnection = {
    readyState: 0,
  };
  return {
    __esModule: true,
    default: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      connection: mockConnection,
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
    connection: mockConnection,
  };
});

describe("MongoDB connection utility", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

    // Clear the global cache
    const globalAny = globalThis as typeof globalThis & {
      __mongooseCache?: unknown;
    };
    delete globalAny.__mongooseCache;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should throw if MONGODB_URI is not defined and no uri is provided", async () => {
    delete process.env.MONGODB_URI;
    const { connectMongoDB } = await import("@/lib/db/mongodb");

    await expect(connectMongoDB()).rejects.toThrow(
      "MONGODB_URI is not defined"
    );
  });

  it("should connect with provided URI", async () => {
    const mockedMongoose = (await import("mongoose")).default;
    (mockedMongoose.connect as jest.MockedFunction<typeof mongoose.connect>).mockResolvedValue(
      mockedMongoose as unknown as typeof mongoose
    );

    const { connectMongoDB } = await import("@/lib/db/mongodb");
    const result = await connectMongoDB("mongodb://custom:27017/custom-db");

    expect(mockedMongoose.connect).toHaveBeenCalledWith(
      "mongodb://custom:27017/custom-db",
      expect.objectContaining({
        maxPoolSize: 10,
        minPoolSize: 2,
      })
    );
    expect(result).toBe(mockedMongoose);
  });

  it("should use MONGODB_URI from env when no uri is provided", async () => {
    const mockedMongoose = (await import("mongoose")).default;
    (mockedMongoose.connect as jest.MockedFunction<typeof mongoose.connect>).mockResolvedValue(
      mockedMongoose as unknown as typeof mongoose
    );

    const { connectMongoDB } = await import("@/lib/db/mongodb");
    await connectMongoDB();

    expect(mockedMongoose.connect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/test-db",
      expect.any(Object)
    );
  });

  it("should return cached connection on subsequent calls", async () => {
    const mockedMongoose = (await import("mongoose")).default;
    (mockedMongoose.connect as jest.MockedFunction<typeof mongoose.connect>).mockResolvedValue(
      mockedMongoose as unknown as typeof mongoose
    );

    const { connectMongoDB } = await import("@/lib/db/mongodb");
    const first = await connectMongoDB();
    const second = await connectMongoDB();

    expect(first).toBe(second);
    expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("should disconnect and clear cache", async () => {
    const mockedMongoose = (await import("mongoose")).default;
    (mockedMongoose.connect as jest.MockedFunction<typeof mongoose.connect>).mockResolvedValue(
      mockedMongoose as unknown as typeof mongoose
    );
    (mockedMongoose.disconnect as jest.MockedFunction<typeof mongoose.disconnect>).mockResolvedValue(
      undefined as never
    );

    const { connectMongoDB, disconnectMongoDB } = await import(
      "@/lib/db/mongodb"
    );
    await connectMongoDB();
    await disconnectMongoDB();

    expect(mockedMongoose.disconnect).toHaveBeenCalled();
  });

  it("should return mongoose connection readyState", async () => {
    const { getMongoDBConnectionState } = await import("@/lib/db/mongodb");
    const state = getMongoDBConnectionState();
    expect(typeof state).toBe("number");
  });
});
