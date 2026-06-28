import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { StandingsService } from "@/services/standings.service";
import { CompetitionService } from "@/services/competition.service";
import { StandingModel, TeamStandingModel } from "@/models/standing.model";
import { RaceResultModel } from "@/models/race-result.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { CompetitionModel } from "@/models/competition.model";
import { OrganizationModel } from "@/models/organization.model";

// Mock TimescaleDB queryWithRetry
jest.mock("@/lib/db/timescaledb", () => ({
  queryWithRetry: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

import { queryWithRetry } from "@/lib/db/timescaledb";

const mockedQueryWithRetry = queryWithRetry as jest.MockedFunction<
  typeof queryWithRetry
>;

let mongoServer: MongoMemoryServer;
let standingsService: StandingsService;
let competitionService: CompetitionService;

const seasonId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  standingsService = new StandingsService();
  competitionService = new CompetitionService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await StandingModel.deleteMany({});
  await TeamStandingModel.deleteMany({});
  await RaceResultModel.deleteMany({});
  await RaceModel.deleteMany({});
  await PersonModel.deleteMany({});
  await CompetitionModel.deleteMany({});
  await OrganizationModel.deleteMany({});
  mockedQueryWithRetry.mockClear();
});

/** Helper to create a person */
async function createPerson(overrides: Partial<{
  first: string;
  last: string;
  category: string;
  organizationIds: mongoose.Types.ObjectId[];
}> = {}) {
  return PersonModel.create({
    name: { first: overrides.first ?? "Test", last: overrides.last ?? "Racer" },
    email: `${Math.random().toString(36).slice(2)}@test.com`,
    roles: ["racer"],
    category: overrides.category ?? "cat3",
    organizationIds: overrides.organizationIds ?? [],
    isRegistered: true,
  });
}

/** Helper to create a race */
async function createRace(overrides: Partial<{
  raceType: string;
  seasonId: mongoose.Types.ObjectId;
}> = {}) {
  return RaceModel.create({
    name: "Test Race",
    date: new Date(),
    location: { name: "Test Venue" },
    raceType: overrides.raceType ?? "crit",
    seasonId: overrides.seasonId ?? seasonId,
    status: "completed",
  });
}

/** Helper to create a race result */
async function createRaceResult(data: {
  raceId: mongoose.Types.ObjectId;
  racerId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  category: string;
  position: number;
  finishTime: number;
}) {
  return RaceResultModel.create(data);
}

describe("StandingsService", () => {
  describe("calculate", () => {
    it("should compute standings using points scoring method (Req 6.1)", async () => {
      // Create competition with points table
      const competition = await competitionService.create({
        name: "Points Competition",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11 },
        },
      });

      // Create racers
      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });

      // Create races
      const race1 = await createRace();
      const race2 = await createRace();

      // Create results: racer1 wins both, racer2 is 2nd in both
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(2);
      // Racer1 should be position 1 with 50 points (25 + 25)
      const standing1 = standings.find(
        (s) => s.racerId.toString() === racer1._id.toString()
      )!;
      expect(standing1.position).toBe(1);
      expect(standing1.totalPoints).toBe(50);
      expect(standing1.totalRaces).toBe(2);

      // Racer2 should be position 2 with 40 points (20 + 20)
      const standing2 = standings.find(
        (s) => s.racerId.toString() === racer2._id.toString()
      )!;
      expect(standing2.position).toBe(2);
      expect(standing2.totalPoints).toBe(40);
      expect(standing2.totalRaces).toBe(2);
    });

    it("should apply countBestN to only count top-N results (Req 6.1)", async () => {
      const competition = await competitionService.create({
        name: "Best-of-2 Competition",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11 },
          countBestN: 2,
        },
      });

      const racer = await createPerson({ first: "Charlie" });
      const race1 = await createRace();
      const race2 = await createRace();
      const race3 = await createRace();

      // Racer gets positions 1, 3, 5 (points: 25, 16, 11)
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 3,
        finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race3._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 5,
        finishTime: 3800000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      // Only best 2: 25 + 16 = 41 (not 25 + 16 + 11 = 52)
      expect(standings[0].totalPoints).toBe(41);
      expect(standings[0].totalRaces).toBe(3);
    });

    it("should compute standings using time scoring method (Req 6.1)", async () => {
      const competition = await competitionService.create({
        name: "Time Trial Cup",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: {
          raceCriteria: { raceTypes: ["time_trial"] },
        },
      });

      const racer1 = await createPerson({ first: "Fast" });
      const racer2 = await createPerson({ first: "Slow" });

      const race1 = await createRace({ raceType: "time_trial" });
      const race2 = await createRace({ raceType: "time_trial" });

      // Racer1: total time = 7000ms, Racer2: total time = 8000ms
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 4000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 4000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(2);
      // Lower time = better position
      const standing1 = standings.find(
        (s) => s.racerId.toString() === racer1._id.toString()
      )!;
      expect(standing1.position).toBe(1);
      expect(standing1.totalPoints).toBe(7000);

      const standing2 = standings.find(
        (s) => s.racerId.toString() === racer2._id.toString()
      )!;
      expect(standing2.position).toBe(2);
      expect(standing2.totalPoints).toBe(8000);
    });

    it("should compute standings using position_average scoring method (Req 6.1)", async () => {
      const competition = await competitionService.create({
        name: "Consistency Cup",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "position_average" },
      });

      const racer1 = await createPerson({ first: "Consistent" });
      const racer2 = await createPerson({ first: "Inconsistent" });

      const race1 = await createRace();
      const race2 = await createRace();

      // Racer1: positions 2, 2 => avg 2.0
      // Racer2: positions 1, 4 => avg 2.5
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 4,
        finishTime: 3900000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(2);
      // Lower average = better position
      const standing1 = standings.find(
        (s) => s.racerId.toString() === racer1._id.toString()
      )!;
      expect(standing1.position).toBe(1);
      expect(standing1.totalPoints).toBe(2.0);

      const standing2 = standings.find(
        (s) => s.racerId.toString() === racer2._id.toString()
      )!;
      expect(standing2.position).toBe(2);
      expect(standing2.totalPoints).toBe(2.5);
    });

    it("should filter results by eligibility criteria (Req 6.13)", async () => {
      // Competition only for cat4/cat5 racers
      const competition = await competitionService.create({
        name: "Rookie Championship",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20 },
        },
        eligibilityCriteria: {
          racerCriteria: { categories: ["cat4", "cat5"] },
        },
      });

      const cat3Racer = await createPerson({ first: "Experienced", category: "cat3" });
      const cat4Racer = await createPerson({ first: "Rookie", category: "cat4" });

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: cat3Racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: cat4Racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat4",
        position: 2,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      // Only cat4 racer should be in standings
      expect(standings).toHaveLength(1);
      expect(standings[0].racerId.toString()).toBe(cat4Racer._id.toString());
      expect(standings[0].position).toBe(1);
      expect(standings[0].totalPoints).toBe(20); // position 2 in pointsTable
    });

    it("should filter by race type eligibility criteria (Req 6.13)", async () => {
      const competition = await competitionService.create({
        name: "Time Trial Cup",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
        eligibilityCriteria: {
          raceCriteria: { raceTypes: ["time_trial"] },
        },
      });

      const racer = await createPerson({ first: "Racer" });
      const critRace = await createRace({ raceType: "crit" });
      const ttRace = await createRace({ raceType: "time_trial" });

      await createRaceResult({
        raceId: critRace._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: ttRace._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 1800000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      // Only the TT result counts (25 points), not the crit
      expect(standings[0].totalPoints).toBe(25);
      expect(standings[0].totalRaces).toBe(1);
    });

    it("should order positions by points descending for points scoring", async () => {
      const competition = await competitionService.create({
        name: "League",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16 },
        },
      });

      const racer1 = await createPerson({ first: "First" });
      const racer2 = await createPerson({ first: "Second" });
      const racer3 = await createPerson({ first: "Third" });
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 3,
        finishTime: 3800000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer3._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings[0].racerId.toString()).toBe(racer2._id.toString());
      expect(standings[0].position).toBe(1);
      expect(standings[1].racerId.toString()).toBe(racer3._id.toString());
      expect(standings[1].position).toBe(2);
      expect(standings[2].racerId.toString()).toBe(racer1._id.toString());
      expect(standings[2].position).toBe(3);
    });

    it("should upsert standings in MongoDB (Req 6.2)", async () => {
      const competition = await competitionService.create({
        name: "League",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer = await createPerson({ first: "Racer" });
      const race1 = await createRace();

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // First calculation
      await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      // Add another result and recalculate
      const race2 = await createRace();
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      // Should update existing standing, not create a duplicate
      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(50); // 25 + 25
      expect(standings[0].totalRaces).toBe(2);

      // Verify only one document in MongoDB
      const count = await StandingModel.countDocuments({
        competitionId: competition._id,
        seasonId,
      });
      expect(count).toBe(1);
    });

    it("should insert standings history into TimescaleDB after calculation", async () => {
      const competition = await competitionService.create({
        name: "League",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer = await createPerson({ first: "Racer" });
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(mockedQueryWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO standings_history"),
        expect.arrayContaining([
          expect.any(String), // time
          racer._id.toString(), // person_id
          competition._id.toString(), // competition_id
          seasonId.toString(), // season_id
          1, // position
          25, // total_points
          1, // total_races
        ])
      );
    });

    it("should throw error for non-existent competition", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        standingsService.calculate(fakeId, seasonId.toString())
      ).rejects.toThrow(`Competition with id "${fakeId}" not found`);
    });

    it("should return empty standings when no eligible results exist", async () => {
      const competition = await competitionService.create({
        name: "Empty Competition",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
        eligibilityCriteria: {
          racerCriteria: { categories: ["cat1"] },
        },
      });

      // Create a cat3 racer and result - won't match cat1 eligibility
      const racer = await createPerson({ first: "Wrong Cat" });
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(0);
    });

    it("should include racer teamId from person organizationIds (Req 6.5)", async () => {
      const teamId = new mongoose.Types.ObjectId();
      const competition = await competitionService.create({
        name: "League",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({
        first: "Team",
        last: "Racer",
        organizationIds: [teamId],
      });
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].teamId?.toString()).toBe(teamId.toString());
    });
  });

  describe("recalculateAll", () => {
    it("should recalculate standings for all active individual competitions in a season", async () => {
      // Create two active competitions
      const comp1 = await competitionService.create({
        name: "Overall",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });
      const comp2 = await competitionService.create({
        name: "TT Cup",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: { raceCriteria: { raceTypes: ["time_trial"] } },
      });

      // Create inactive competition - should not be recalculated
      await competitionService.create({
        name: "Inactive",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points" },
        isActive: false,
      });

      const racer = await createPerson({ first: "Test" });
      const race = await createRace({ raceType: "time_trial" });

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 1800000,
      });

      await standingsService.recalculateAll(seasonId.toString());

      // Check standings for comp1 (should include the result)
      const comp1Standings = await StandingModel.find({
        competitionId: comp1._id,
      });
      expect(comp1Standings).toHaveLength(1);
      expect(comp1Standings[0].totalPoints).toBe(25);

      // Check standings for comp2 (TT cup - should include the TT result)
      const comp2Standings = await StandingModel.find({
        competitionId: comp2._id,
      });
      expect(comp2Standings).toHaveLength(1);
      expect(comp2Standings[0].totalPoints).toBe(1800000);
    });

    it("should also recalculate team-type competitions (Req 6.9)", async () => {
      const { OrganizationModel } = require("@/models/organization.model");

      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25, 2: 20 } },
      });

      const racer = await createPerson({ first: "Racer" });

      // Create a team with the racer as a member
      const team = await OrganizationModel.create({
        name: "Test Team Recalc",
        type: "team",
        memberIds: [racer._id],
      });

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      await standingsService.recalculateAll(seasonId.toString());

      // Team standings should be created
      const { TeamStandingModel } = require("@/models/standing.model");
      const teamStandings = await TeamStandingModel.find({
        competitionId: competition._id,
      });
      expect(teamStandings).toHaveLength(1);
      expect(teamStandings[0].totalPoints).toBe(25);
      expect(teamStandings[0].organizationId.toString()).toBe(team._id.toString());

      // Cleanup
      await OrganizationModel.deleteMany({});
      await TeamStandingModel.deleteMany({});
    });
  });

  describe("TimescaleDB error handling", () => {
    it("should not fail standings calculation if TimescaleDB insert fails", async () => {
      mockedQueryWithRetry.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const competition = await competitionService.create({
        name: "League",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // Should not throw even though TimescaleDB fails
      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(25);
    });
  });

  describe("calculateTeam", () => {
    let OrganizationModelRef: typeof import("@/models/organization.model").OrganizationModel;
    let TeamStandingModelRef: typeof import("@/models/standing.model").TeamStandingModel;

    beforeAll(() => {
      OrganizationModelRef = require("@/models/organization.model").OrganizationModel;
      TeamStandingModelRef = require("@/models/standing.model").TeamStandingModel;
    });

    afterEach(async () => {
      await OrganizationModelRef.deleteMany({});
      await TeamStandingModelRef.deleteMany({});
    });

    it("should compute team standings by summing member points (Req 6.6, 6.7)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16 },
        },
      });

      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });

      // Create team with both racers
      const team = await OrganizationModelRef.create({
        name: "Team Alpha",
        type: "team",
        memberIds: [racer1._id, racer2._id],
      });

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].organizationId.toString()).toBe(team._id.toString());
      // Team total = 25 (racer1 position 1) + 20 (racer2 position 2) = 45
      expect(standings[0].totalPoints).toBe(45);
      expect(standings[0].totalRaces).toBe(1); // 1 unique race
      expect(standings[0].position).toBe(1);
      expect(standings[0].memberResults).toHaveLength(2);
    });

    it("should sort multiple teams by points descending (Req 6.8)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13 },
        },
      });

      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });
      const racer3 = await createPerson({ first: "Charlie" });
      const racer4 = await createPerson({ first: "Dave" });

      // Team Alpha: racer1 (1st) + racer2 (2nd) = 45 points
      const teamAlpha = await OrganizationModelRef.create({
        name: "Team Alpha",
        type: "team",
        memberIds: [racer1._id, racer2._id],
      });

      // Team Beta: racer3 (3rd) + racer4 (4th) = 29 points
      const teamBeta = await OrganizationModelRef.create({
        name: "Team Beta",
        type: "team",
        memberIds: [racer3._id, racer4._id],
      });

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 2,
        finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer3._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 3,
        finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer4._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 4,
        finishTime: 3800000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(2);
      expect(standings[0].organizationId.toString()).toBe(teamAlpha._id.toString());
      expect(standings[0].position).toBe(1);
      expect(standings[0].totalPoints).toBe(45);

      expect(standings[1].organizationId.toString()).toBe(teamBeta._id.toString());
      expect(standings[1].position).toBe(2);
      expect(standings[1].totalPoints).toBe(29);
    });

    it("should throw error for non-existent competition", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        standingsService.calculateTeam(fakeId, seasonId.toString())
      ).rejects.toThrow(`Competition with id "${fakeId}" not found`);
    });

    it("should throw error for non-team competition", async () => {
      const competition = await competitionService.create({
        name: "Individual Comp",
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      await expect(
        standingsService.calculateTeam(
          competition._id.toString(),
          seasonId.toString()
        )
      ).rejects.toThrow(/not a team competition/);
    });

    it("should skip teams with no members", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      // Empty team
      await OrganizationModelRef.create({
        name: "Empty Team",
        type: "team",
        memberIds: [],
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(0);
    });

    it("should apply eligibility criteria to filter team member results (Req 6.17)", async () => {
      const competition = await competitionService.create({
        name: "Team TT Cup",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20 },
        },
        eligibilityCriteria: {
          raceCriteria: { raceTypes: ["time_trial"] },
        },
      });

      const racer = await createPerson({ first: "Racer" });

      await OrganizationModelRef.create({
        name: "Team A",
        type: "team",
        memberIds: [racer._id],
      });

      const critRace = await createRace({ raceType: "crit" });
      const ttRace = await createRace({ raceType: "time_trial" });

      await createRaceResult({
        raceId: critRace._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });
      await createRaceResult({
        raceId: ttRace._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 1800000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      // Only TT result counts (25 points)
      expect(standings[0].totalPoints).toBe(25);
      expect(standings[0].memberResults).toHaveLength(1);
    });

    it("should upsert team standings in MongoDB", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer = await createPerson({ first: "Racer" });

      await OrganizationModelRef.create({
        name: "Team Upsert",
        type: "team",
        memberIds: [racer._id],
      });

      const race1 = await createRace();
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // First calculation
      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      // Add another race result and recalculate
      const race2 = await createRace();
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3500000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      // Should update existing, not create duplicate
      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(50); // 25 + 25
      expect(standings[0].totalRaces).toBe(2);

      const count = await TeamStandingModelRef.countDocuments({
        competitionId: competition._id,
        seasonId,
      });
      expect(count).toBe(1);
    });

    it("should insert team standings history into TimescaleDB", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer = await createPerson({ first: "Racer" });
      const team = await OrganizationModelRef.create({
        name: "Team History",
        type: "team",
        memberIds: [racer._id],
      });

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(mockedQueryWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO team_standings_history"),
        expect.arrayContaining([
          expect.any(String), // time
          team._id.toString(), // organization_id
          competition._id.toString(), // competition_id
          seasonId.toString(), // season_id
          1, // position
          25, // total_points
        ])
      );
    });

    it("should not fail team standings if TimescaleDB insert fails", async () => {
      mockedQueryWithRetry.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await OrganizationModelRef.create({
        name: "Team Resilient",
        type: "team",
        memberIds: [racer._id],
      });

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // Should not throw
      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(25);
    });

    it("should remove team standings for teams no longer qualifying", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer = await createPerson({ first: "Racer" });
      const team = await OrganizationModelRef.create({
        name: "Team Remove",
        type: "team",
        memberIds: [racer._id],
      });

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId,
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });

      // First calculation creates a standing
      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      // Remove all members from team
      await OrganizationModelRef.findByIdAndUpdate(team._id, {
        $set: { memberIds: [] },
      });

      // Recalculate - team should be removed
      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString()
      );

      expect(standings).toHaveLength(0);

      const count = await TeamStandingModelRef.countDocuments({
        competitionId: competition._id,
        seasonId,
      });
      expect(count).toBe(0);
    });
  });
});
