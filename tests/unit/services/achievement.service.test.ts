import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { AchievementService } from "@/services/achievement.service";
import {
  AchievementModel,
  EarnedAchievementModel,
} from "@/models/achievement.model";
import { RaceResultModel } from "@/models/race-result.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { SeasonModel } from "@/models/season.model";
import { EnrollmentModel } from "@/models/enrollment.model";
import { SeasonService } from "@/services/season.service";
import { RaceService } from "@/services/race.service";
import { RaceResultService, setOnAchievementCheckCallback } from "@/services/race-result.service";
import { EnrollmentService } from "@/services/enrollment.service";

let mongoServer: MongoMemoryServer;
let service: AchievementService;
let seasonService: SeasonService;
let raceService: RaceService;
let raceResultService: RaceResultService;
let enrollmentService: EnrollmentService;
const defaultLeagueId = new mongoose.Types.ObjectId().toString();
const otherLeagueId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new AchievementService();
  seasonService = new SeasonService();
  raceService = new RaceService();
  raceResultService = new RaceResultService();
  enrollmentService = new EnrollmentService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await AchievementModel.deleteMany({});
  await EarnedAchievementModel.deleteMany({});
  await RaceResultModel.deleteMany({});
  await RaceModel.deleteMany({});
  await PersonModel.deleteMany({});
  await SeasonModel.deleteMany({});
  await EnrollmentModel.deleteMany({});
  setOnAchievementCheckCallback(null);
});

/** Helper to create a season */
async function createSeason() {
  return seasonService.create({
    name: "2024 Season",
    leagueId: defaultLeagueId,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });
}

/** Helper to create a race */
async function createRace(seasonId: string, name?: string) {
  return raceService.create({
    name: name ?? "Downtown Crit",
    date: new Date("2024-06-15"),
    location: { name: "City Center" },
    raceType: "crit",
    leagueId: defaultLeagueId,
    categories: ["cat3"],
    seasonId,
  });
}

/** Helper to create a racer */
async function createRacer() {
  return PersonModel.create({
    name: { first: "Test", last: "Racer" },
    email: `racer-${Date.now()}-${Math.random()}@example.com`,
    roles: ["racer"],
    category: "cat3",
    isRegistered: true,
  });
}

describe("AchievementService", () => {
  describe("define", () => {
    it("should create an achievement with trigger criteria and badge (Req 7.1)", async () => {
      const achievement = await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge-first-race.png",
      });

      expect(achievement).toBeDefined();
      expect(achievement.name).toBe("First Race");
      expect(achievement.description).toBe("Complete your first race");
      expect(achievement.triggerCriteria.type).toBe("races_completed");
      expect(achievement.triggerCriteria.threshold).toBe(1);
      expect(achievement.badgeUrl).toBe("https://example.com/badge-first-race.png");
      expect(achievement.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("checkAndAward", () => {
    it("should award achievement when threshold is met (Req 7.2)", async () => {
      const season = await createSeason();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      // Define an achievement with threshold of 1
      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      // Enter a race result for the racer (with leagueId)
      await RaceResultModel.create({
        raceId: race._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // Check and award - now scoped to league-season
      const awarded = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );

      expect(awarded).toHaveLength(1);
      expect(awarded[0].personId.toString()).toBe(racer._id.toString());
      expect(awarded[0].seasonId.toString()).toBe(season._id.toString());
      expect(awarded[0].leagueId.toString()).toBe(defaultLeagueId);
      expect(awarded[0].racesAtTime).toBe(1);
    });

    it("should not award achievement when threshold is not met", async () => {
      const season = await createSeason();
      const racer = await createRacer();

      // Define an achievement with threshold of 5
      await service.define({
        name: "Veteran",
        description: "Complete 5 races",
        triggerCriteria: { type: "races_completed", threshold: 5 },
        badgeUrl: "https://example.com/badge-veteran.png",
      });

      // No race results at all
      const awarded = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );

      expect(awarded).toHaveLength(0);
    });

    it("should prevent duplicate awards - idempotent (Req 7.4)", async () => {
      const season = await createSeason();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      await RaceResultModel.create({
        raceId: race._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // First call awards
      const firstAward = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );
      expect(firstAward).toHaveLength(1);

      // Second call should not award again (idempotent)
      const secondAward = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );
      expect(secondAward).toHaveLength(0);

      // Verify only one earned achievement exists
      const earnedCount = await EarnedAchievementModel.countDocuments({
        personId: racer._id,
        seasonId: season._id,
        leagueId: defaultLeagueId,
      });
      expect(earnedCount).toBe(1);
    });

    it("should award multiple achievements when multiple thresholds are met", async () => {
      const season = await createSeason();
      const racer = await createRacer();

      // Define two achievements
      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge1.png",
      });
      await service.define({
        name: "Third Race",
        description: "Complete 3 races",
        triggerCriteria: { type: "races_completed", threshold: 3 },
        badgeUrl: "https://example.com/badge3.png",
      });

      // Create 3 race results (with leagueId)
      for (let i = 0; i < 3; i++) {
        const race = await createRace(season._id.toString(), `Race ${i + 1}`);
        await RaceResultModel.create({
          raceId: race._id,
          racerId: racer._id,
          leagueId: defaultLeagueId,
          seasonId: season._id,
          category: "cat3",
          position: i + 1,
          finishTime: 3600000 + i * 1000,
        });
      }

      const awarded = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );

      expect(awarded).toHaveLength(2);
    });
  });

  describe("getByPerson", () => {
    it("should return earned achievements for a person (Req 7.3, 7.5)", async () => {
      const season = await createSeason();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      await RaceResultModel.create({
        raceId: race._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );

      const earned = await service.getByPerson(racer._id.toString());
      expect(earned).toHaveLength(1);
      expect(earned[0].personId.toString()).toBe(racer._id.toString());
    });
  });

  describe("resetForSeason", () => {
    it("should delete earned achievements for a season (Req 7.6)", async () => {
      const season = await createSeason();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      await RaceResultModel.create({
        raceId: race._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );

      // Verify earned achievement exists
      let count = await EarnedAchievementModel.countDocuments({
        seasonId: season._id,
      });
      expect(count).toBe(1);

      // Reset for season
      const deletedCount = await service.resetForSeason(season._id.toString());
      expect(deletedCount).toBe(1);

      // Verify earned achievements are gone
      count = await EarnedAchievementModel.countDocuments({
        seasonId: season._id,
      });
      expect(count).toBe(0);
    });
  });

  describe("wireAchievementCheck", () => {
    it("should trigger achievement check after race result entry", async () => {
      const season = await createSeason();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      // Enroll the racer in the league-season (required by RaceResultService)
      const adminId = new mongoose.Types.ObjectId().toString();
      await enrollmentService.enrollPerson(
        racer._id.toString(),
        defaultLeagueId,
        season._id.toString(),
        adminId
      );

      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      // Wire the achievement check
      const { wireAchievementCheck } = await import("@/services/achievement.service");
      wireAchievementCheck();

      // Enter a result which should trigger the callback
      await raceResultService.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      // Wait for the async callback to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify achievement was awarded with leagueId
      const earned = await EarnedAchievementModel.find({
        personId: racer._id,
        seasonId: season._id,
        leagueId: defaultLeagueId,
      });
      expect(earned).toHaveLength(1);
      expect(earned[0].leagueId.toString()).toBe(defaultLeagueId);
    });
  });

  describe("league-season scoping", () => {
    it("should only count race results from the specified league-season (Req 5.3)", async () => {
      const season = await createSeason();
      const racer = await createRacer();

      // Define an achievement with threshold of 2
      await service.define({
        name: "Two Races",
        description: "Complete 2 races",
        triggerCriteria: { type: "races_completed", threshold: 2 },
        badgeUrl: "https://example.com/badge-two.png",
      });

      // Create 1 race result in the default league
      const race1 = await createRace(season._id.toString(), "Default League Race");
      await RaceResultModel.create({
        raceId: race1._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // Create 1 race result in a different league (same season)
      const otherRace = await RaceModel.create({
        name: "Other League Race",
        date: new Date("2024-07-15"),
        location: { name: "Other Location" },
        raceType: "crit",
        leagueId: otherLeagueId,
        categories: ["cat3"],
        seasonId: season._id,
        status: "completed",
      });
      await RaceResultModel.create({
        raceId: otherRace._id,
        racerId: racer._id,
        leagueId: otherLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });

      // Check in default league - only 1 result there, should NOT award (threshold is 2)
      const awardedDefault = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );
      expect(awardedDefault).toHaveLength(0);

      // Check in other league - only 1 result there, should NOT award
      const awardedOther = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        otherLeagueId
      );
      expect(awardedOther).toHaveLength(0);
    });

    it("should allow same achievement to be earned in different leagues independently (Req 5.4)", async () => {
      const season = await createSeason();
      const racer = await createRacer();

      await service.define({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });

      // Race result in default league
      const race1 = await createRace(season._id.toString(), "Default Race");
      await RaceResultModel.create({
        raceId: race1._id,
        racerId: racer._id,
        leagueId: defaultLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // Race result in other league
      const otherRace = await RaceModel.create({
        name: "Other Race",
        date: new Date("2024-07-15"),
        location: { name: "Other Location" },
        raceType: "crit",
        leagueId: otherLeagueId,
        categories: ["cat3"],
        seasonId: season._id,
        status: "completed",
      });
      await RaceResultModel.create({
        raceId: otherRace._id,
        racerId: racer._id,
        leagueId: otherLeagueId,
        seasonId: season._id,
        category: "cat3",
        position: 2,
        finishTime: 3700000,
      });

      // Award in default league
      const awardedDefault = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        defaultLeagueId
      );
      expect(awardedDefault).toHaveLength(1);
      expect(awardedDefault[0].leagueId.toString()).toBe(defaultLeagueId);

      // Award in other league - should also succeed (unique index includes leagueId)
      const awardedOther = await service.checkAndAward(
        racer._id.toString(),
        season._id.toString(),
        otherLeagueId
      );
      expect(awardedOther).toHaveLength(1);
      expect(awardedOther[0].leagueId.toString()).toBe(otherLeagueId);

      // Total earned achievements: 2 (one per league)
      const total = await EarnedAchievementModel.countDocuments({
        personId: racer._id,
      });
      expect(total).toBe(2);
    });
  });
});
