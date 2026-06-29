/**
 * Reference Data Migration CLI Script
 *
 * Migrates existing data into the league-scoped reference data system by:
 * 1. Seeding default reference data items for all existing leagues
 * 2. Splitting the Person `roles` array into `securityRoles` and `personTypes`
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/migrate-reference-data.ts
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/migrate-reference-data.ts --dry-run
 *
 * Flags:
 *   --dry-run   Preview migration without writing any data
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.7
 */

import * as fs from "fs";
import * as path from "path";
import { connectMongoDB, disconnectMongoDB } from "@/lib/db/mongodb";
import { ReferenceDataService } from "@/services/reference-data.service";
import { LeagueModel } from "@/models/league.model";
import { PersonModel } from "@/models/person.model";

const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(
  LOG_DIR,
  `migration-reference-data-${new Date().toISOString().replace(/[:.]/g, "-")}.log`
);

/** Security roles that remain hardcoded (not reference data) */
const SECURITY_ROLES = new Set([
  "administrator",
  "super_administrator",
  "league_administrator",
]);

/** Person types that become reference data */
const PERSON_TYPES = new Set([
  "racer",
  "volunteer",
  "mentor",
  "race_official",
]);

/** Batch size for person updates */
const PERSON_BATCH_SIZE = 100;

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

interface MigrationStats {
  leaguesProcessed: number;
  leaguesSkipped: number;
  personsProcessed: number;
  personsSkipped: number;
  errors: number;
}

async function seedReferenceDataForLeagues(
  dryRun: boolean,
  logger: (msg: string) => void
): Promise<{ processed: number; skipped: number }> {
  const referenceDataService = new ReferenceDataService();
  const leagues = await LeagueModel.find({}).lean();

  logger(`Found ${leagues.length} league(s) to process for reference data seeding`);

  let processed = 0;
  let skipped = 0;

  for (const league of leagues) {
    const leagueId = league._id.toString();
    logger(`  Processing league: "${league.name}" (${leagueId})`);

    if (dryRun) {
      logger(`    [DRY RUN] Would seed default reference data for league "${league.name}"`);
      processed++;
      continue;
    }

    try {
      await referenceDataService.seedDefaults(leagueId);
      logger(`    ✓ Seeded default reference data for league "${league.name}"`);
      processed++;
    } catch (error: unknown) {
      // Handle duplicate key errors gracefully (idempotency)
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        logger(`    ⊘ Skipped league "${league.name}" - reference data already exists`);
        skipped++;
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger(`    ✗ Error seeding league "${league.name}": ${errorMessage}`);
        throw error;
      }
    }
  }

  return { processed, skipped };
}

async function migratePersonRoles(
  dryRun: boolean,
  logger: (msg: string) => void
): Promise<{ processed: number; skipped: number }> {
  // Find all people who have a roles array but haven't been migrated yet
  // (i.e., securityRoles and personTypes are both empty/default)
  const totalCount = await PersonModel.countDocuments({
    roles: { $exists: true, $ne: [] },
  });

  logger(`Found ${totalCount} person(s) with non-empty roles to process`);

  let processed = 0;
  let skipped = 0;
  let offset = 0;

  while (offset < totalCount) {
    const batch = await PersonModel.find({
      roles: { $exists: true, $ne: [] },
    })
      .skip(offset)
      .limit(PERSON_BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    logger(`  Processing person batch ${Math.floor(offset / PERSON_BATCH_SIZE) + 1} (${batch.length} persons)`);

    for (const person of batch) {
      const roles: string[] = (person.roles as string[]) || [];

      // Split roles into security roles and person types
      const securityRoles = roles.filter((role) => SECURITY_ROLES.has(role));
      const personTypes = roles.filter((role) => PERSON_TYPES.has(role));

      // Check if already migrated (both fields already populated)
      const existingSecurityRoles = (person.securityRoles as string[]) || [];
      const existingPersonTypes = (person.personTypes as string[]) || [];

      if (existingSecurityRoles.length > 0 || existingPersonTypes.length > 0) {
        skipped++;
        continue;
      }

      if (dryRun) {
        logger(
          `    [DRY RUN] Would update person "${person.email}": ` +
            `securityRoles=[${securityRoles.join(", ")}], personTypes=[${personTypes.join(", ")}]`
        );
        processed++;
        continue;
      }

      try {
        await PersonModel.updateOne(
          { _id: person._id },
          {
            $set: {
              securityRoles,
              personTypes,
            },
          }
        );
        processed++;
      } catch (error: unknown) {
        // Handle duplicate key errors gracefully
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code: number }).code === 11000
        ) {
          logger(`    ⊘ Skipped person "${person.email}" - duplicate key error`);
          skipped++;
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger(`    ✗ Error updating person "${person.email}": ${errorMessage}`);
          throw error;
        }
      }
    }

    offset += PERSON_BATCH_SIZE;
  }

  return { processed, skipped };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const logger = createLogger();

  logger("=== Reference Data Migration Script ===");
  logger(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  logger(`Log file: ${LOG_FILE}`);
  logger("");

  const stats: MigrationStats = {
    leaguesProcessed: 0,
    leaguesSkipped: 0,
    personsProcessed: 0,
    personsSkipped: 0,
    errors: 0,
  };

  try {
    await connectMongoDB();
    logger("Connected to MongoDB");
    logger("");

    // Step 1: Seed reference data for all existing leagues
    logger("--- Step 1: Seed reference data for existing leagues ---");
    const leagueResult = await seedReferenceDataForLeagues(dryRun, logger);
    stats.leaguesProcessed = leagueResult.processed;
    stats.leaguesSkipped = leagueResult.skipped;
    logger(`  Done: ${leagueResult.processed} processed, ${leagueResult.skipped} skipped`);
    logger("");

    // Step 2: Split person roles into securityRoles and personTypes
    logger("--- Step 2: Migrate person roles ---");
    const personResult = await migratePersonRoles(dryRun, logger);
    stats.personsProcessed = personResult.processed;
    stats.personsSkipped = personResult.skipped;
    logger(`  Done: ${personResult.processed} processed, ${personResult.skipped} skipped`);
    logger("");

    // Summary
    logger("=== Migration Summary ===");
    logger(`Leagues: ${stats.leaguesProcessed} processed, ${stats.leaguesSkipped} skipped`);
    logger(`Persons: ${stats.personsProcessed} processed, ${stats.personsSkipped} skipped`);
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
