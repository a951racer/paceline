import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CompetitionService } from "@/services/competition.service";
import { CompetitionModel } from "@/models/competition.model";

let mongoServer: MongoMemoryServer;
let service: CompetitionService;

const seasonId = new mongoose.Types.ObjectId().toString();
const leagueId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new CompetitionService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await CompetitionModel.deleteMany({});
});

describe("CompetitionService", () => {
  describe("create", () => {
    it("should create a competition with name, scoring method, and eligibility criteria (Req 6.14)", async () => {
      const competition = await service.create({
        name: "Overall League Champion",
        description: "Season-long competition for all racers",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11 },
          countBestN: 10,
        },
        eligibilityCriteria: {
          racerCriteria: {
            categories: ["cat1", "cat2", "cat3"],
          },
        },
      });

      expect(competition.name).toBe("Overall League Champion");
      expect(competition.description).toBe(
        "Season-long competition for all racers"
      );
      expect(competition.leagueId.toString()).toBe(leagueId);
      expect(competition.seasonId.toString()).toBe(seasonId);
      expect(competition.type).toBe("individual");
      expect(competition.scoringMethod.type).toBe("points");
      expect(competition.scoringMethod.countBestN).toBe(10);
      expect(competition.eligibilityCriteria.racerCriteria?.categories).toEqual([
        "cat1",
        "cat2",
        "cat3",
      ]);
      expect(competition.isActive).toBe(true);
      expect(competition.createdAt).toBeInstanceOf(Date);
      expect(competition.updatedAt).toBeInstanceOf(Date);
    });

    it("should default isActive to true", async () => {
      const competition = await service.create({
        name: "Test Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      expect(competition.isActive).toBe(true);
    });

    it("should allow creating inactive competition", async () => {
      const competition = await service.create({
        name: "Inactive Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "time" },
        isActive: false,
      });

      expect(competition.isActive).toBe(false);
    });

    it("should default eligibility criteria to empty object if not provided", async () => {
      const competition = await service.create({
        name: "Open Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      expect(competition.eligibilityCriteria).toBeDefined();
    });

    it("should create a team competition (Req 6.12)", async () => {
      const competition = await service.create({
        name: "Team Championship",
        leagueId,
        seasonId,
        type: "team",
        scoringMethod: { type: "points" },
      });

      expect(competition.type).toBe("team");
    });
  });

  describe("evaluateEligibility", () => {
    it("should return true when no eligibility criteria are set (open to all)", async () => {
      const competition = await service.create({
        name: "Open Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const result = service.evaluateEligibility(
        { category: "cat4", raceType: "crit", raceId: "race123" },
        competition
      );

      expect(result).toBe(true);
    });

    it("should return true when racer's category is in the allowed list (Req 6.15)", async () => {
      const competition = await service.create({
        name: "Rookie Championship",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          racerCriteria: {
            categories: ["cat4", "cat5", "beginner"],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat4", raceType: "crit", raceId: "race123" },
        competition
      );

      expect(result).toBe(true);
    });

    it("should return false when racer's category is NOT in the allowed list (Req 6.15)", async () => {
      const competition = await service.create({
        name: "Rookie Championship",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          racerCriteria: {
            categories: ["cat4", "cat5", "beginner"],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat1", raceType: "crit", raceId: "race123" },
        competition
      );

      expect(result).toBe(false);
    });

    it("should return true when race type is in the allowed list (Req 6.16)", async () => {
      const competition = await service.create({
        name: "Time Trial Cup",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: {
          raceCriteria: {
            raceTypes: ["time_trial"],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat2", raceType: "time_trial", raceId: "race123" },
        competition
      );

      expect(result).toBe(true);
    });

    it("should return false when race type is NOT in the allowed list (Req 6.16)", async () => {
      const competition = await service.create({
        name: "Time Trial Cup",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: {
          raceCriteria: {
            raceTypes: ["time_trial"],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat2", raceType: "crit", raceId: "race123" },
        competition
      );

      expect(result).toBe(false);
    });

    it("should return true when race ID is in the specific race IDs list", async () => {
      const raceId = new mongoose.Types.ObjectId().toString();
      const competition = await service.create({
        name: "Specific Races Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          raceCriteria: {
            specificRaceIds: [raceId],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat3", raceType: "road_race", raceId },
        competition
      );

      expect(result).toBe(true);
    });

    it("should return false when race ID is NOT in the specific race IDs list", async () => {
      const allowedRaceId = new mongoose.Types.ObjectId().toString();
      const otherRaceId = new mongoose.Types.ObjectId().toString();
      const competition = await service.create({
        name: "Specific Races Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          raceCriteria: {
            specificRaceIds: [allowedRaceId],
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat3", raceType: "road_race", raceId: otherRaceId },
        competition
      );

      expect(result).toBe(false);
    });

    it("should check both racer and race criteria (both must pass)", async () => {
      const competition = await service.create({
        name: "Restricted Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          racerCriteria: {
            categories: ["cat3", "cat4"],
          },
          raceCriteria: {
            raceTypes: ["crit", "road_race"],
          },
        },
      });

      // Both criteria satisfied
      expect(
        service.evaluateEligibility(
          { category: "cat3", raceType: "crit", raceId: "race1" },
          competition
        )
      ).toBe(true);

      // Category fails
      expect(
        service.evaluateEligibility(
          { category: "cat1", raceType: "crit", raceId: "race1" },
          competition
        )
      ).toBe(false);

      // Race type fails
      expect(
        service.evaluateEligibility(
          { category: "cat3", raceType: "time_trial", raceId: "race1" },
          competition
        )
      ).toBe(false);
    });

    it("should accept all racers when firstYearOnly is true (not tracked yet)", async () => {
      const competition = await service.create({
        name: "Rookie Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          racerCriteria: {
            firstYearOnly: true,
          },
        },
      });

      const result = service.evaluateEligibility(
        { category: "cat2", raceType: "crit", raceId: "race1" },
        competition
      );

      expect(result).toBe(true);
    });

    it("should not check minRaces at eligibility time", async () => {
      const competition = await service.create({
        name: "Attendance Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        eligibilityCriteria: {
          racerCriteria: {
            minRaces: 5,
          },
        },
      });

      // Should still be eligible regardless of minRaces
      const result = service.evaluateEligibility(
        { category: "cat3", raceType: "crit", raceId: "race1" },
        competition
      );

      expect(result).toBe(true);
    });
  });

  describe("getActive", () => {
    it("should return only active competitions (Req 6.12)", async () => {
      await service.create({
        name: "Active Competition 1",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        isActive: true,
      });

      await service.create({
        name: "Inactive Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        isActive: false,
      });

      await service.create({
        name: "Active Competition 2",
        leagueId,
        seasonId,
        type: "team",
        scoringMethod: { type: "points" },
        isActive: true,
      });

      const active = await service.getActive();

      expect(active).toHaveLength(2);
      const names = active.map((c) => c.name).sort();
      expect(names).toEqual(["Active Competition 1", "Active Competition 2"]);
    });

    it("should return empty array when no active competitions exist", async () => {
      await service.create({
        name: "Inactive Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
        isActive: false,
      });

      const active = await service.getActive();
      expect(active).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return a competition by ID", async () => {
      const created = await service.create({
        name: "Test Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const found = await service.getById(created._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Test Competition");
    });

    it("should return null for non-existent competition", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return all competitions sorted by name", async () => {
      await service.create({
        name: "Zebra Championship",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });
      await service.create({
        name: "Alpha Cup",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "time" },
      });

      const competitions = await service.list();

      expect(competitions).toHaveLength(2);
      expect(competitions[0].name).toBe("Alpha Cup");
      expect(competitions[1].name).toBe("Zebra Championship");
    });

    it("should filter by seasonId when provided", async () => {
      const otherSeasonId = new mongoose.Types.ObjectId().toString();

      await service.create({
        name: "Season 1 Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });
      await service.create({
        name: "Season 2 Competition",
        leagueId,
        seasonId: otherSeasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const competitions = await service.list({ seasonId });

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toBe("Season 1 Competition");
    });

    it("should return empty array when no competitions exist", async () => {
      const competitions = await service.list();
      expect(competitions).toHaveLength(0);
    });

    it("should filter by leagueId when provided (Req 9.2, 9.3)", async () => {
      const otherLeagueId = new mongoose.Types.ObjectId().toString();

      await service.create({
        name: "League A Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });
      await service.create({
        name: "League B Competition",
        leagueId: otherLeagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const competitions = await service.list({ leagueId });

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toBe("League A Competition");
    });

    it("should filter by both leagueId and seasonId when provided", async () => {
      const otherSeasonId = new mongoose.Types.ObjectId().toString();

      await service.create({
        name: "League Season Match",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });
      await service.create({
        name: "Same League Other Season",
        leagueId,
        seasonId: otherSeasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const competitions = await service.list({ leagueId, seasonId });

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toBe("League Season Match");
    });
  });

  describe("update", () => {
    it("should update competition fields", async () => {
      const created = await service.create({
        name: "Original Name",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const updated = await service.update(created._id.toString(), {
        name: "Updated Name",
        description: "New description",
        isActive: false,
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("New description");
      expect(updated.isActive).toBe(false);
    });

    it("should update scoring method", async () => {
      const created = await service.create({
        name: "Competition",
        leagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points" },
      });

      const updated = await service.update(created._id.toString(), {
        scoringMethod: { type: "time" },
      });

      expect(updated.scoringMethod.type).toBe("time");
    });

    it("should throw error for non-existent competition", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.update(fakeId, { name: "New Name" })
      ).rejects.toThrow(`Competition with id "${fakeId}" not found`);
    });
  });
});
