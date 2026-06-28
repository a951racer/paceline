/**
 * TimescaleDB (PostgreSQL) connection utility with node-postgres.
 * Provides connection pooling, retry logic for transient failures,
 * and graceful shutdown handling.
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from "pg";

/** TimescaleDB pool configuration */
interface TimescaleDBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const DEFAULT_POOL_CONFIG = {
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Cached pool instance to prevent multiple pools in development
 * (Next.js hot-reloads can create new module instances).
 */
interface PoolCache {
  pool: Pool | null;
}

const globalWithPool = globalThis as typeof globalThis & {
  __timescalePool?: PoolCache;
};

function getPoolCache(): PoolCache {
  if (!globalWithPool.__timescalePool) {
    globalWithPool.__timescalePool = { pool: null };
  }
  return globalWithPool.__timescalePool;
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
    const message = error.message.toLowerCase();
    const transientPatterns = [
      "econnrefused",
      "econnreset",
      "etimedout",
      "enetunreach",
      "ehostunreach",
      "connection terminated unexpectedly",
      "connection timeout",
      "too many clients",
    ];
    return transientPatterns.some((pattern) => message.includes(pattern));
  }
  return false;
}

/**
 * Builds the pool configuration from environment variables or provided config.
 */
function buildPoolConfig(config?: Partial<TimescaleDBConfig>): PoolConfig {
  return {
    host: config?.host ?? process.env.TIMESCALEDB_HOST,
    port: config?.port ?? (Number(process.env.TIMESCALEDB_PORT) || 5432),
    database: config?.database ?? process.env.TIMESCALEDB_DATABASE,
    user: config?.user ?? process.env.TIMESCALEDB_USER,
    password: config?.password ?? process.env.TIMESCALEDB_PASSWORD,
    max: config?.max ?? DEFAULT_POOL_CONFIG.max,
    min: config?.min ?? DEFAULT_POOL_CONFIG.min,
    idleTimeoutMillis:
      config?.idleTimeoutMillis ?? DEFAULT_POOL_CONFIG.idleTimeoutMillis,
    connectionTimeoutMillis:
      config?.connectionTimeoutMillis ??
      DEFAULT_POOL_CONFIG.connectionTimeoutMillis,
  };
}

/**
 * Gets or creates a connection pool for TimescaleDB.
 * Uses a cached pool to prevent exhausting connections during development hot-reloads.
 *
 * @param config - Optional pool configuration override
 * @returns pg Pool instance
 */
export function getTimescalePool(config?: Partial<TimescaleDBConfig>): Pool {
  const cache = getPoolCache();

  if (cache.pool) {
    return cache.pool;
  }

  const poolConfig = buildPoolConfig(config);

  // Validate required fields
  if (!poolConfig.host || !poolConfig.database || !poolConfig.user) {
    throw new Error(
      "TimescaleDB connection configuration is incomplete. " +
        "Please set TIMESCALEDB_HOST, TIMESCALEDB_DATABASE, TIMESCALEDB_USER, " +
        "and TIMESCALEDB_PASSWORD in your environment variables."
    );
  }

  const pool = new Pool(poolConfig);

  // Handle pool-level errors
  pool.on("error", (err) => {
    console.error("[TimescaleDB] Unexpected pool error:", err.message);
  });

  pool.on("connect", () => {
    console.log("[TimescaleDB] New client connected to pool");
  });

  cache.pool = pool;
  console.log("[TimescaleDB] Connection pool created");

  return pool;
}

/**
 * Executes a query with retry logic for transient failures.
 *
 * @param text - SQL query string (supports parameterized queries)
 * @param params - Query parameters
 * @param retryAttempts - Number of retry attempts for transient failures
 * @returns Query result
 */
export async function queryWithRetry<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
  retryAttempts: number = DEFAULT_POOL_CONFIG.retryAttempts
): Promise<QueryResult<T>> {
  const pool = getTimescalePool();

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const result = await pool.query<T>(text, params);
      return result;
    } catch (error) {
      const isLastAttempt = attempt === retryAttempts;

      if (isLastAttempt || !isTransientError(error)) {
        console.error(
          `[TimescaleDB] Query failed after ${attempt} attempt(s):`,
          error instanceof Error ? error.message : error
        );
        throw error;
      }

      const backoffMs =
        DEFAULT_POOL_CONFIG.retryDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[TimescaleDB] Query attempt ${attempt}/${retryAttempts} failed. Retrying in ${backoffMs}ms...`
      );
      await delay(backoffMs);
    }
  }

  // This should not be reached, but satisfies TypeScript
  throw new Error("[TimescaleDB] Query failed: exhausted all retry attempts");
}

/**
 * Gets a client from the pool for transactions.
 * The caller is responsible for releasing the client.
 *
 * @returns PoolClient instance
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getTimescalePool();
  return pool.connect();
}

/**
 * Executes a function within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 *
 * @param fn - Async function to execute within the transaction
 * @returns Result of the transaction function
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Disconnects the TimescaleDB pool gracefully.
 * Call this during application shutdown.
 */
export async function disconnectTimescaleDB(): Promise<void> {
  const cache = getPoolCache();

  if (cache.pool) {
    await cache.pool.end();
    cache.pool = null;
    console.log("[TimescaleDB] Connection pool closed");
  }
}

/**
 * Returns the current pool statistics.
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  const pool = getTimescalePool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

// Register graceful shutdown handlers
if (typeof process !== "undefined") {
  const shutdown = async (signal: string) => {
    console.log(`[TimescaleDB] Received ${signal}. Closing pool...`);
    await disconnectTimescaleDB();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
