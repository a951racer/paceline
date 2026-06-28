/**
 * MongoDB connection utility with Mongoose.
 * Provides connection pooling, retry logic for transient failures,
 * and graceful shutdown handling.
 */

import mongoose from "mongoose";

/** MongoDB connection configuration */
interface MongoDBConfig {
  uri: string;
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: Omit<MongoDBConfig, "uri"> = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Cached connection promise to prevent multiple connections in development
 * (Next.js hot-reloads can create new module instances).
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use global variable to persist connection across hot-reloads in development
const globalWithMongoose = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

function getCache(): MongooseCache {
  if (!globalWithMongoose.__mongooseCache) {
    globalWithMongoose.__mongooseCache = { conn: null, promise: null };
  }
  return globalWithMongoose.__mongooseCache;
}

/**
 * Delays execution for the specified milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is a transient failure that can be retried.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const transientCodes = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ];
    const message = error.message.toLowerCase();
    return (
      transientCodes.some((code) => message.includes(code.toLowerCase())) ||
      message.includes("topology was destroyed") ||
      message.includes("server selection timed out")
    );
  }
  return false;
}

/**
 * Connects to MongoDB with retry logic.
 * Uses a cached connection in development to avoid exhausting connections
 * during Next.js hot-reloads.
 *
 * @param uri - MongoDB connection string. If not provided, uses MONGODB_URI from env.
 * @returns Mongoose instance
 */
export async function connectMongoDB(uri?: string): Promise<typeof mongoose> {
  const cache = getCache();

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const connectionUri = uri ?? process.env.MONGODB_URI;

    if (!connectionUri) {
      throw new Error(
        "MONGODB_URI is not defined. Please set it in your environment variables."
      );
    }

    cache.promise = connectWithRetry(connectionUri, DEFAULT_CONFIG);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

/**
 * Internal connection function with retry logic for transient failures.
 */
async function connectWithRetry(
  uri: string,
  config: Omit<MongoDBConfig, "uri">
): Promise<typeof mongoose> {
  const { retryAttempts, retryDelayMs, ...mongooseOptions } = config;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const connection = await mongoose.connect(uri, {
        maxPoolSize: mongooseOptions.maxPoolSize,
        minPoolSize: mongooseOptions.minPoolSize,
        maxIdleTimeMS: mongooseOptions.maxIdleTimeMS,
        serverSelectionTimeoutMS: mongooseOptions.serverSelectionTimeoutMS,
        connectTimeoutMS: mongooseOptions.connectTimeoutMS,
      });

      console.log("[MongoDB] Connected successfully");
      return connection;
    } catch (error) {
      const isLastAttempt = attempt === retryAttempts;

      if (isLastAttempt || !isTransientError(error)) {
        console.error(
          `[MongoDB] Connection failed after ${attempt} attempt(s):`,
          error instanceof Error ? error.message : error
        );
        // Reset the cache so future calls can retry
        const cache = getCache();
        cache.promise = null;
        cache.conn = null;
        throw error;
      }

      const backoffMs = retryDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[MongoDB] Connection attempt ${attempt}/${retryAttempts} failed. Retrying in ${backoffMs}ms...`
      );
      await delay(backoffMs);
    }
  }

  // This should not be reached, but satisfies TypeScript
  throw new Error("[MongoDB] Connection failed: exhausted all retry attempts");
}

/**
 * Disconnects from MongoDB gracefully.
 * Call this during application shutdown.
 */
export async function disconnectMongoDB(): Promise<void> {
  const cache = getCache();

  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
    console.log("[MongoDB] Disconnected successfully");
  }
}

/**
 * Returns the current Mongoose connection state.
 */
export function getMongoDBConnectionState(): number {
  return mongoose.connection.readyState;
}

// Register graceful shutdown handlers
if (typeof process !== "undefined") {
  const shutdown = async (signal: string) => {
    console.log(`[MongoDB] Received ${signal}. Closing connection...`);
    await disconnectMongoDB();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
