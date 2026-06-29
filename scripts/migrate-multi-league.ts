/**
 * Multi-League Migration CLI Script
 *
 * Migrates existing single-league data into the multi-league system by:
 * 1. Creating a default league from existing branding configuration
 * 2. Associating all existing records with the default league
 * 3. Creating enrollment records from existing race results
 * 4. Upgrading administrator roles to Super_Admin
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/migrate-multi-league.ts
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/migrate-multi-league.ts --dry-run
 *
 * Flags:
 *   --dry-run   Preview migration without writing any data
 *
 * Requirements: 10.1, 10.6, 10.7
 */

import * as fs from "fs";
import * as path from "path";
import { MigrationService } from "@/services/migration.service";
import { disconnectMongoDB } from "@/lib/db/mongodb";

const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, `migration-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function createLogger(): (message: string) => void {
  ensureLogDir();
  const stream = fs.createWriteStream(LOG_FILE, { flags: "a" });

  return (message: string) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    stream.write(line + "\n");
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const logger = createLogger();

  logger("=== Multi-League Migration Script ===");
  logger(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  logger(`Log file: ${LOG_FILE}`);
  logger("");

  const service = new MigrationService({ dryRun, logger });

  try {
    const result = await service.runMigration();

    logger("");
    logger("=== Migration Summary ===");
    logger(`Success: ${result.success}`);
    logger(`Default League ID: ${result.defaultLeagueId}`);
    logger("");

    for (const step of result.steps) {
      logger(`  ${step.step}: ${step.recordsAffected} affected, ${step.skipped} skipped (${step.duration}ms)`);
    }

    logger("");

    if (result.verification.details.length > 0) {
      logger("=== Verification Details ===");
      for (const detail of result.verification.details) {
        const status = detail.unmigratedCount === 0 ? "✓" : "✗";
        logger(`  ${status} ${detail.collection}: ${detail.migratedCount}/${detail.totalCount} migrated`);
      }
    }

    if (result.verification.errors.length > 0) {
      logger("");
      logger("=== Verification Errors ===");
      for (const err of result.verification.errors) {
        logger(`  ERROR: ${err}`);
      }
    }

    if (!result.success) {
      logger("");
      logger(`Migration failed: ${result.error || "verification errors detected"}`);
      await disconnectMongoDB();
      process.exit(1);
    }

    logger("");
    logger("Migration completed successfully.");
    await disconnectMongoDB();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger(`FATAL ERROR: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger(error.stack);
    }
    await disconnectMongoDB();
    process.exit(1);
  }
}

main();
