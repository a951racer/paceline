/**
 * TimescaleDB migration runner.
 * Executes SQL migration files against the TimescaleDB instance
 * using the connection pool from the timescaledb utility.
 *
 * Usage: npx ts-node src/lib/db/migrations/run-migrations.ts
 * Or via npm script: npm run db:migrate
 */

import * as fs from "fs";
import * as path from "path";
import { getTimescalePool, disconnectTimescaleDB } from "@/lib/db/timescaledb";

const MIGRATIONS_DIR = path.resolve(__dirname);

/**
 * Ensures the migrations tracking table exists.
 * This table records which migrations have already been applied.
 */
async function ensureMigrationsTable(): Promise<void> {
  const pool = getTimescalePool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Returns a sorted list of .sql migration files in the migrations directory.
 */
function getMigrationFiles(): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Returns the set of already-applied migration names.
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getTimescalePool();
  const result = await pool.query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY id"
  );
  return new Set(result.rows.map((row) => row.name));
}

/**
 * Applies a single migration file within a transaction.
 */
async function applyMigration(fileName: string): Promise<void> {
  const pool = getTimescalePool();
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sql = fs.readFileSync(filePath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO _migrations (name) VALUES ($1)",
      [fileName]
    );
    await client.query("COMMIT");
    console.log(`[Migration] Applied: ${fileName}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`[Migration] Failed to apply ${fileName}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Runs all pending migrations in order.
 */
async function runMigrations(): Promise<void> {
  console.log("[Migration] Starting migration run...");

  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const migrationFiles = getMigrationFiles();
  const pending = migrationFiles.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("[Migration] No pending migrations.");
    return;
  }

  console.log(`[Migration] ${pending.length} pending migration(s) to apply.`);

  for (const file of pending) {
    await applyMigration(file);
  }

  console.log("[Migration] All migrations applied successfully.");
}

// Main entry point
async function main(): Promise<void> {
  try {
    await runMigrations();
  } catch (error) {
    console.error("[Migration] Migration run failed:", error);
    process.exit(1);
  } finally {
    await disconnectTimescaleDB();
  }
}

main();
