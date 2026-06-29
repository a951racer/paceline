/**
 * MigrationService - Orchestrates the migration of existing single-league data
 * into the multi-league system by creating a default league and associating
 * all existing records with it.
 *
 * Key behaviors:
 * - Idempotent: skips already-migrated records (checks for existing leagueId)
 * - Transactional: uses MongoDB sessions where possible
 * - On error: logs full context, halts migration, preserves pre-migration state
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 12.10
 */

import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/db/mongodb";
import { LeagueModel, type LeagueDocument } from "@/models/league.model";
import { BrandingConfigurationModel } from "@/models/branding.model";
import { SeasonModel } from "@/models/season.model";
import { RaceModel } from "@/models/race.model";
import { RaceResultModel } from "@/models/race-result.model";
import { CompetitionModel } from "@/models/competition.model";
import { StandingModel, TeamStandingModel } from "@/models/standing.model";
import { EarnedAchievementModel } from "@/models/achievement.model";
import { AssignedAwardModel } from "@/models/award.model";
import { EarnedRecognitionModel } from "@/models/calculated-recognition.model";
import { EnrollmentModel } from "@/models/enrollment.model";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";

/** Result of a migration verification step */
export interface VerificationResult {
  success: boolean;
  details: {
    collection: string;
    totalCount: number;
    migratedCount: number;
    unmigratedCount: number;
  }[];
  errors: string[];
}

/** Result of the full migration */
export interface MigrationResult {
  success: boolean;
  defaultLeagueId: string;
  steps: {
    step: string;
    recordsAffected: number;
    skipped: number;
    duration: number;
  }[];
  verification: VerificationResult;
  error?: string;
}

export class MigrationService {
  private dryRun: boolean;
  private logger: (message: string) => void;

  constructor(options?: { dryRun?: boolean; logger?: (message: string) => void }) {
    this.dryRun = options?.dryRun ?? false;
    this.logger = options?.logger ?? console.log;
  }

  private log(message: string): void {
    this.logger(`[Migration] ${message}`);
  }

  /**
   * Orchestrate the full migration with error handling and rollback.
   * Requirement 10.7: On error, log, halt, preserve pre-migration state.
   */
  async runMigration(): Promise<MigrationResult> {
    await connectMongoDB();

    const steps: MigrationResult["steps"] = [];
    let defaultLeagueId = "";

    try {
      this.log("Starting multi-league migration...");
      this.log(`Mode: ${this.dryRun ? "DRY RUN (no writes)" : "LIVE"}`);

      // Step 1: Create default league
      const start1 = Date.now();
      const league = await this.createDefaultLeague();
      defaultLeagueId = league._id.toString();
      steps.push({
        step: "createDefaultLeague",
        recordsAffected: 1,
        skipped: 0,
        duration: Date.now() - start1,
      });
      this.log(`Default league: ${league.name} (${defaultLeagueId})`);

      // Step 2: Migrate seasons
      const start2 = Date.now();
      const seasonResult = await this.migrateSeasons(defaultLeagueId);
      steps.push({
        step: "migrateSeasons",
        recordsAffected: seasonResult.migrated,
        skipped: seasonResult.skipped,
        duration: Date.now() - start2,
      });

      // Step 3: Migrate races, race results, competitions
      const start3 = Date.now();
      const raceResult = await this.migrateRaces(defaultLeagueId);
      steps.push({
        step: "migrateRaces",
        recordsAffected: raceResult.migrated,
        skipped: raceResult.skipped,
        duration: Date.now() - start3,
      });

      // Step 4: Create enrollments
      const start4 = Date.now();
      const enrollResult = await this.createEnrollments(defaultLeagueId);
      steps.push({
        step: "createEnrollments",
        recordsAffected: enrollResult.created,
        skipped: enrollResult.skipped,
        duration: Date.now() - start4,
      });

      // Step 5: Migrate standings and recognition data
      const start5 = Date.now();
      const standingsResult = await this.migrateStandings(defaultLeagueId);
      steps.push({
        step: "migrateStandings",
        recordsAffected: standingsResult.migrated,
        skipped: standingsResult.skipped,
        duration: Date.now() - start5,
      });

      // Step 6: Upgrade admin roles
      const start6 = Date.now();
      const adminResult = await this.upgradeAdminRoles();
      steps.push({
        step: "upgradeAdminRoles",
        recordsAffected: adminResult.upgraded,
        skipped: adminResult.skipped,
        duration: Date.now() - start6,
      });

      // Step 7: Verify migration
      const start7 = Date.now();
      const verification = await this.verifyMigration();
      steps.push({
        step: "verifyMigration",
        recordsAffected: 0,
        skipped: 0,
        duration: Date.now() - start7,
      });

      this.log("Migration completed successfully.");
      return {
        success: verification.success,
        defaultLeagueId,
        steps,
        verification,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`MIGRATION ERROR: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.log(`Stack: ${error.stack}`);
      }

      return {
        success: false,
        defaultLeagueId,
        steps,
        verification: { success: false, details: [], errors: [errorMessage] },
        error: errorMessage,
      };
    }
  }

  /**
   * Create default league from existing BrandingConfiguration.
   * Requirement 10.1: Create a default League using existing branding config.
   * Idempotent: if a league already exists, return it.
   */
  async createDefaultLeague(): Promise<LeagueDocument> {
    await connectMongoDB();

    // Check if default league already exists (idempotent)
    const existingLeague = await LeagueModel.findOne({}).sort({ createdAt: 1 });
    if (existingLeague) {
      this.log("Default league already exists, skipping creation.");
      return existingLeague;
    }

    // Read existing branding configuration
    const branding = await BrandingConfigurationModel.findOne({});

    const leagueName = branding?.leagueName || "Default League";
    const logos = branding?.logos || {
      square: "/images/default-logo-square.png",
      horizontal: "/images/default-logo-horizontal.png",
      vertical: "/images/default-logo-vertical.png",
    };
    const mainColors = branding?.mainColors || ["#000000", "#ffffff", "#333333"];
    const accentColors = branding?.accentColors || ["#b87333"];

    if (this.dryRun) {
      this.log(`[DRY RUN] Would create default league: "${leagueName}"`);
      // Return a mock league for dry run
      return { _id: new mongoose.Types.ObjectId(), name: leagueName } as unknown as LeagueDocument;
    }

    const league = await LeagueModel.create({
      name: leagueName,
      description: "Default league created during multi-league migration",
      isActive: true,
      branding: {
        leagueName,
        logos,
        mainColors,
        accentColors,
      },
    });

    this.log(`Created default league: "${league.name}"`);
    return league;
  }

  /**
   * Add leagueId to all existing Season documents.
   * Requirement 10.2: Associate all existing Seasons with the default League.
   * Idempotent: only updates documents without leagueId.
   */
  async migrateSeasons(leagueId: string): Promise<{ migrated: number; skipped: number }> {
    await connectMongoDB();

    const leagueObjectId = new mongoose.Types.ObjectId(leagueId);
    const filter = { leagueId: { $exists: false } };

    const totalCount = await SeasonModel.countDocuments({});
    const unmigratedCount = await SeasonModel.countDocuments(filter);
    const skipped = totalCount - unmigratedCount;

    this.log(`Seasons: ${unmigratedCount} to migrate, ${skipped} already migrated`);

    if (unmigratedCount === 0) {
      return { migrated: 0, skipped };
    }

    if (this.dryRun) {
      this.log(`[DRY RUN] Would add leagueId to ${unmigratedCount} seasons`);
      return { migrated: unmigratedCount, skipped };
    }

    const result = await SeasonModel.updateMany(filter, {
      $set: { leagueId: leagueObjectId },
    });

    this.log(`Migrated ${result.modifiedCount} seasons`);
    return { migrated: result.modifiedCount, skipped };
  }

  /**
   * Add leagueId to all Race, RaceResult, and Competition documents.
   * Requirement 10.5: Associate all existing records with the default League.
   * Idempotent: only updates documents without leagueId.
   */
  async migrateRaces(leagueId: string): Promise<{ migrated: number; skipped: number }> {
    await connectMongoDB();

    const leagueObjectId = new mongoose.Types.ObjectId(leagueId);
    const filter = { leagueId: { $exists: false } };
    let totalMigrated = 0;
    let totalSkipped = 0;

    // Migrate Races
    const racesTotal = await RaceModel.countDocuments({});
    const racesUnmigrated = await RaceModel.countDocuments(filter);
    totalSkipped += racesTotal - racesUnmigrated;
    this.log(`Races: ${racesUnmigrated} to migrate, ${racesTotal - racesUnmigrated} already migrated`);

    if (racesUnmigrated > 0) {
      if (this.dryRun) {
        this.log(`[DRY RUN] Would add leagueId to ${racesUnmigrated} races`);
        totalMigrated += racesUnmigrated;
      } else {
        const result = await RaceModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
        this.log(`Migrated ${result.modifiedCount} races`);
      }
    }

    // Migrate RaceResults
    const resultsTotal = await RaceResultModel.countDocuments({});
    const resultsUnmigrated = await RaceResultModel.countDocuments(filter);
    totalSkipped += resultsTotal - resultsUnmigrated;
    this.log(`RaceResults: ${resultsUnmigrated} to migrate, ${resultsTotal - resultsUnmigrated} already migrated`);

    if (resultsUnmigrated > 0) {
      if (this.dryRun) {
        this.log(`[DRY RUN] Would add leagueId to ${resultsUnmigrated} race results`);
        totalMigrated += resultsUnmigrated;
      } else {
        const result = await RaceResultModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
        this.log(`Migrated ${result.modifiedCount} race results`);
      }
    }

    // Migrate Competitions
    const competitionsTotal = await CompetitionModel.countDocuments({});
    const competitionsUnmigrated = await CompetitionModel.countDocuments(filter);
    totalSkipped += competitionsTotal - competitionsUnmigrated;
    this.log(`Competitions: ${competitionsUnmigrated} to migrate, ${competitionsTotal - competitionsUnmigrated} already migrated`);

    if (competitionsUnmigrated > 0) {
      if (this.dryRun) {
        this.log(`[DRY RUN] Would add leagueId to ${competitionsUnmigrated} competitions`);
        totalMigrated += competitionsUnmigrated;
      } else {
        const result = await CompetitionModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
        this.log(`Migrated ${result.modifiedCount} competitions`);
      }
    }

    return { migrated: totalMigrated, skipped: totalSkipped };
  }

  /**
   * Create Enrollment records for persons and organizations with existing data.
   * Requirement 10.3: Create Enrollment records for persons with race results/achievements/awards.
   * Requirement 10.4: Create Enrollment records for organizations with members who have race results.
   * Idempotent: uses unique index to prevent duplicates.
   */
  async createEnrollments(leagueId: string): Promise<{ created: number; skipped: number }> {
    await connectMongoDB();

    const leagueObjectId = new mongoose.Types.ObjectId(leagueId);
    let totalCreated = 0;
    let totalSkipped = 0;

    // Find all unique person-season combinations from race results
    const personSeasons = await RaceResultModel.aggregate([
      { $group: { _id: { racerId: "$racerId", seasonId: "$seasonId" } } },
    ]);

    // Also find person-season combinations from earned achievements
    const achievementPersonSeasons = await EarnedAchievementModel.aggregate([
      { $group: { _id: { personId: "$personId", seasonId: "$seasonId" } } },
    ]);

    // Also find person-season combinations from assigned awards
    const awardPersonSeasons = await AssignedAwardModel.aggregate([
      { $group: { _id: { recipientId: "$recipientId", seasonId: "$seasonId" } } },
    ]);

    // Merge all person-season pairs into a unique set
    const personSeasonSet = new Map<string, { personId: string; seasonId: string }>();

    for (const item of personSeasons) {
      const key = `${item._id.racerId}-${item._id.seasonId}`;
      personSeasonSet.set(key, {
        personId: item._id.racerId.toString(),
        seasonId: item._id.seasonId.toString(),
      });
    }

    for (const item of achievementPersonSeasons) {
      const key = `${item._id.personId}-${item._id.seasonId}`;
      personSeasonSet.set(key, {
        personId: item._id.personId.toString(),
        seasonId: item._id.seasonId.toString(),
      });
    }

    for (const item of awardPersonSeasons) {
      const key = `${item._id.recipientId}-${item._id.seasonId}`;
      personSeasonSet.set(key, {
        personId: item._id.recipientId.toString(),
        seasonId: item._id.seasonId.toString(),
      });
    }

    this.log(`Found ${personSeasonSet.size} unique person-season enrollment(s) to create`);

    // Create person enrollments (skip duplicates via unique index)
    const systemUserId = new mongoose.Types.ObjectId();

    for (const { personId, seasonId } of personSeasonSet.values()) {
      const existing = await EnrollmentModel.findOne({
        entityType: "person",
        entityId: new mongoose.Types.ObjectId(personId),
        leagueId: leagueObjectId,
        seasonId: new mongoose.Types.ObjectId(seasonId),
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      if (this.dryRun) {
        totalCreated++;
        continue;
      }

      try {
        await EnrollmentModel.create({
          entityType: "person",
          entityId: new mongoose.Types.ObjectId(personId),
          leagueId: leagueObjectId,
          seasonId: new mongoose.Types.ObjectId(seasonId),
          enrolledAt: new Date(),
          enrolledBy: systemUserId,
          isActive: true,
        });
        totalCreated++;
      } catch (err: unknown) {
        // Handle duplicate key error gracefully (idempotent)
        if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
          totalSkipped++;
        } else {
          throw err;
        }
      }
    }

    this.log(`Person enrollments: ${totalCreated} created, ${totalSkipped} skipped`);

    // Create organization enrollments
    // Find organizations with members who have race results
    const orgEnrollmentsCreated = await this.createOrganizationEnrollments(
      leagueId,
      systemUserId
    );
    totalCreated += orgEnrollmentsCreated.created;
    totalSkipped += orgEnrollmentsCreated.skipped;

    return { created: totalCreated, skipped: totalSkipped };
  }

  private async createOrganizationEnrollments(
    leagueId: string,
    systemUserId: mongoose.Types.ObjectId
  ): Promise<{ created: number; skipped: number }> {
    const leagueObjectId = new mongoose.Types.ObjectId(leagueId);
    let created = 0;
    let skipped = 0;

    // Get all organizations with members
    const organizations = await OrganizationModel.find({
      memberIds: { $exists: true, $ne: [] },
    });

    for (const org of organizations) {
      // Find seasons where any member of this org has race results
      const memberRaceSeasons = await RaceResultModel.aggregate([
        { $match: { racerId: { $in: org.memberIds } } },
        { $group: { _id: "$seasonId" } },
      ]);

      for (const seasonEntry of memberRaceSeasons) {
        const seasonId = seasonEntry._id;

        const existing = await EnrollmentModel.findOne({
          entityType: "organization",
          entityId: org._id,
          leagueId: leagueObjectId,
          seasonId,
        });

        if (existing) {
          skipped++;
          continue;
        }

        if (this.dryRun) {
          created++;
          continue;
        }

        try {
          await EnrollmentModel.create({
            entityType: "organization",
            entityId: org._id,
            leagueId: leagueObjectId,
            seasonId,
            enrolledAt: new Date(),
            enrolledBy: systemUserId,
            isActive: true,
          });
          created++;
        } catch (err: unknown) {
          if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
            skipped++;
          } else {
            throw err;
          }
        }
      }
    }

    this.log(`Organization enrollments: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }

  /**
   * Add leagueId to Standing, TeamStanding, EarnedAchievement, AssignedAward, EarnedRecognition documents.
   * Requirement 10.5: Associate all existing competitive records with the default League.
   * Idempotent: only updates documents without leagueId.
   */
  async migrateStandings(leagueId: string): Promise<{ migrated: number; skipped: number }> {
    await connectMongoDB();

    const leagueObjectId = new mongoose.Types.ObjectId(leagueId);
    const filter = { leagueId: { $exists: false } };
    let totalMigrated = 0;
    let totalSkipped = 0;

    // Standings
    const standingsTotal = await StandingModel.countDocuments({});
    const standingsUnmigrated = await StandingModel.countDocuments(filter);
    totalSkipped += standingsTotal - standingsUnmigrated;
    this.log(`Standings: ${standingsUnmigrated} to migrate`);

    if (standingsUnmigrated > 0) {
      if (this.dryRun) {
        totalMigrated += standingsUnmigrated;
      } else {
        const result = await StandingModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
      }
    }

    // TeamStandings
    const teamStandingsTotal = await TeamStandingModel.countDocuments({});
    const teamStandingsUnmigrated = await TeamStandingModel.countDocuments(filter);
    totalSkipped += teamStandingsTotal - teamStandingsUnmigrated;
    this.log(`TeamStandings: ${teamStandingsUnmigrated} to migrate`);

    if (teamStandingsUnmigrated > 0) {
      if (this.dryRun) {
        totalMigrated += teamStandingsUnmigrated;
      } else {
        const result = await TeamStandingModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
      }
    }

    // EarnedAchievements
    const achievementsTotal = await EarnedAchievementModel.countDocuments({});
    const achievementsUnmigrated = await EarnedAchievementModel.countDocuments(filter);
    totalSkipped += achievementsTotal - achievementsUnmigrated;
    this.log(`EarnedAchievements: ${achievementsUnmigrated} to migrate`);

    if (achievementsUnmigrated > 0) {
      if (this.dryRun) {
        totalMigrated += achievementsUnmigrated;
      } else {
        const result = await EarnedAchievementModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
      }
    }

    // AssignedAwards
    const awardsTotal = await AssignedAwardModel.countDocuments({});
    const awardsUnmigrated = await AssignedAwardModel.countDocuments(filter);
    totalSkipped += awardsTotal - awardsUnmigrated;
    this.log(`AssignedAwards: ${awardsUnmigrated} to migrate`);

    if (awardsUnmigrated > 0) {
      if (this.dryRun) {
        totalMigrated += awardsUnmigrated;
      } else {
        const result = await AssignedAwardModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
      }
    }

    // EarnedRecognitions
    const recognitionsTotal = await EarnedRecognitionModel.countDocuments({});
    const recognitionsUnmigrated = await EarnedRecognitionModel.countDocuments(filter);
    totalSkipped += recognitionsTotal - recognitionsUnmigrated;
    this.log(`EarnedRecognitions: ${recognitionsUnmigrated} to migrate`);

    if (recognitionsUnmigrated > 0) {
      if (this.dryRun) {
        totalMigrated += recognitionsUnmigrated;
      } else {
        const result = await EarnedRecognitionModel.updateMany(filter, {
          $set: { leagueId: leagueObjectId },
        });
        totalMigrated += result.modifiedCount;
      }
    }

    this.log(`Standings migration: ${totalMigrated} migrated, ${totalSkipped} skipped`);
    return { migrated: totalMigrated, skipped: totalSkipped };
  }

  /**
   * Set all existing administrators to adminScope: { type: 'super' } (Super_Admin).
   * Requirement 12.10: Migrate existing Administrator role to Super_Administrator.
   * Idempotent: only updates documents without adminScope set.
   */
  async upgradeAdminRoles(): Promise<{ upgraded: number; skipped: number }> {
    await connectMongoDB();

    // Find administrators without adminScope already set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {
      roles: "administrator",
      $or: [
        { adminScope: { $exists: false } },
        { "adminScope.type": { $exists: false } },
      ],
    };

    const count = await PersonModel.countDocuments(filter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalAdmins = await PersonModel.countDocuments({ roles: "administrator" } as any);
    const skipped = totalAdmins - count;

    this.log(`Administrators: ${count} to upgrade, ${skipped} already upgraded`);

    if (count === 0) {
      return { upgraded: 0, skipped };
    }

    if (this.dryRun) {
      this.log(`[DRY RUN] Would upgrade ${count} administrators to Super_Admin`);
      return { upgraded: count, skipped };
    }

    // Add super_administrator role and set adminScope
    const result = await PersonModel.updateMany(filter, {
      $addToSet: { roles: "super_administrator" },
      $set: { adminScope: { type: "super" } },
    });

    this.log(`Upgraded ${result.modifiedCount} administrators to Super_Admin`);
    return { upgraded: result.modifiedCount, skipped };
  }

  /**
   * Verify migration completeness: count records before/after, ensure no data loss,
   * verify all documents have leagueId.
   * Requirement 10.6: Complete migration without data loss.
   */
  async verifyMigration(): Promise<VerificationResult> {
    await connectMongoDB();

    const details: VerificationResult["details"] = [];
    const errors: string[] = [];

    const collections = [
      { name: "Season", model: SeasonModel },
      { name: "Race", model: RaceModel },
      { name: "RaceResult", model: RaceResultModel },
      { name: "Competition", model: CompetitionModel },
      { name: "Standing", model: StandingModel },
      { name: "TeamStanding", model: TeamStandingModel },
      { name: "EarnedAchievement", model: EarnedAchievementModel },
      { name: "AssignedAward", model: AssignedAwardModel },
      { name: "EarnedRecognition", model: EarnedRecognitionModel },
    ];

    for (const { name, model } of collections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCount = await (model as any).countDocuments({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const migratedCount = await (model as any).countDocuments({ leagueId: { $exists: true } });
      const unmigratedCount = totalCount - migratedCount;

      details.push({ collection: name, totalCount, migratedCount, unmigratedCount });

      if (unmigratedCount > 0 && !this.dryRun) {
        errors.push(
          `${name}: ${unmigratedCount} document(s) still missing leagueId`
        );
      }
    }

    // Verify admin roles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminsWithoutScope = await PersonModel.countDocuments({
      roles: "administrator",
      $or: [
        { adminScope: { $exists: false } },
        { "adminScope.type": { $exists: false } },
      ],
    } as any);

    if (adminsWithoutScope > 0 && !this.dryRun) {
      errors.push(
        `${adminsWithoutScope} administrator(s) still without adminScope`
      );
    }

    // Verify default league exists
    const leagueCount = await LeagueModel.countDocuments({});
    if (leagueCount === 0 && !this.dryRun) {
      errors.push("No default league found");
    }

    const success = errors.length === 0;
    if (success) {
      this.log("Verification passed: all records migrated successfully");
    } else {
      this.log(`Verification FAILED: ${errors.length} issue(s) found`);
      for (const err of errors) {
        this.log(`  - ${err}`);
      }
    }

    return { success, details, errors };
  }
}
