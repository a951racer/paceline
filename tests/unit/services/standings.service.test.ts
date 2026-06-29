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
import { EnrollmentModel } from "@/models/enrollment.model";

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
const leagueId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();

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
  await EnrollmentModel.deleteMany({});
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

/** Helper to enroll a person in the league-season */
async function enrollPerson(personId: mongoose.Types.ObjectId) {
  return EnrollmentModel.create({
    entityType: "person",
    entityId: personId,
    leagueId,
    seasonId,
    enrolledAt: new Date(),
    enrolledBy: adminId,
    isActive: true,
  });
}

/** Helper to enroll an organization in the league-season */
async function enrollOrganization(orgId: mongoose.Types.ObjectId) {
  return EnrollmentModel.create({
    entityType: "organization",
    entityId: orgId,
    leagueId,
    seasonId,
    enrolledAt: new Date(),
    enrolledBy: adminId,
    isActive: true,
  });
}

/** Helper to create a race */
async function createRace(overrides: Partial<{
  raceType: string;
  seasonId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
}> = {}) {
  return RaceModel.create({
    name: "Test Race",
    date: new Date(),
    location: { name: "Test Venue" },
    raceType: overrides.raceType ?? "crit",
    seasonId: overrides.seasonId ?? seasonId,
    leagueId: overrides.leagueId ?? leagueId,
    status: "completed",
  });
}

/** Helper to create a race result */
async function createRaceResult(data: {
  raceId: mongoose.Types.ObjectId;
  racerId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  leagueId?: mongoose.Types.ObjectId;
  category: string;
  position: number;
  finishTime: number;
}) {
  return RaceResultModel.create({
    ...data,
    leagueId: data.leagueId ?? leagueId,
  });
}

describe("StandingsService", () => {
  describe("calculate", () => {
    it("should compute standings using points scoring method (Req 6.1)", async () => {
      const competition = await competitionService.create({
        name: "Points Competition",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11 },
        },
      });

      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);

      const race1 = await createRace();
      const race2 = await createRace();

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(2);
      const standing1 = standings.find(
        (s) => s.racerId.toString() === racer1._id.toString()
      )!;
      expect(standing1.position).toBe(1);
      expect(standing1.totalPoints).toBe(50);
      expect(standing1.totalRaces).toBe(2);

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
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11 },
          countBestN: 2,
        },
      });

      const racer = await createPerson({ first: "Charlie" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race1 = await createRace();
      const race2 = await createRace();
      const race3 = await createRace();

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 3, finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race3._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 5, finishTime: 3800000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(41);
      expect(standings[0].totalRaces).toBe(3);
    });

    it("should compute standings using time scoring method (Req 6.1)", async () => {
      const competition = await competitionService.create({
        name: "Time Trial Cup",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: {
          raceCriteria: { raceTypes: ["time_trial"] },
        },
      });

      const racer1 = await createPerson({ first: "Fast" });
      const racer2 = await createPerson({ first: "Slow" });
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);

      const race1 = await createRace({ raceType: "time_trial" });
      const race2 = await createRace({ raceType: "time_trial" });

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 4000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 4000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(2);
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
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "position_average" },
      });

      const racer1 = await createPerson({ first: "Consistent" });
      const racer2 = await createPerson({ first: "Inconsistent" });
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);

      const race1 = await createRace();
      const race2 = await createRace();

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 4, finishTime: 3900000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(2);
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
      const competition = await competitionService.create({
        name: "Rookie Championship",
        leagueId: leagueId.toString(),
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
      await enrollPerson(cat3Racer._id as mongoose.Types.ObjectId);
      await enrollPerson(cat4Racer._id as mongoose.Types.ObjectId);

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: cat3Racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: cat4Racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat4", position: 2, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].racerId.toString()).toBe(cat4Racer._id.toString());
      expect(standings[0].position).toBe(1);
      expect(standings[0].totalPoints).toBe(20);
    });

    it("should exclude non-enrolled racers from standings (Req 7.5, 7.6)", async () => {
      const competition = await competitionService.create({
        name: "League Standings",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20 },
        },
      });

      const enrolledRacer = await createPerson({ first: "Enrolled" });
      const notEnrolledRacer = await createPerson({ first: "NotEnrolled" });
      // Only enroll one racer
      await enrollPerson(enrolledRacer._id as mongoose.Types.ObjectId);

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: enrolledRacer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: notEnrolledRacer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      // Only enrolled racer should appear
      expect(standings).toHaveLength(1);
      expect(standings[0].racerId.toString()).toBe(enrolledRacer._id.toString());
    });

    it("should write leagueId to standing records", async () => {
      const competition = await competitionService.create({
        name: "League",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      const doc = await StandingModel.findOne({ competitionId: competition._id });
      expect(doc!.leagueId.toString()).toBe(leagueId.toString());
    });

    it("should upsert standings in MongoDB (Req 6.2)", async () => {
      const competition = await competitionService.create({
        name: "League",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race1 = await createRace();

      await createRaceResult({
        raceId: race1._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      const race2 = await createRace();
      await createRaceResult({
        raceId: race2._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(50);
      expect(standings[0].totalRaces).toBe(2);

      const count = await StandingModel.countDocuments({
        competitionId: competition._id, seasonId,
      });
      expect(count).toBe(1);
    });

    it("should insert standings history into TimescaleDB with leagueId", async () => {
      const competition = await competitionService.create({
        name: "League",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(mockedQueryWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO standings_history"),
        expect.arrayContaining([
          expect.any(String), // time
          racer._id.toString(), // person_id
          competition._id.toString(), // competition_id
          seasonId.toString(), // season_id
          leagueId.toString(), // league_id
          1, // position
          25, // total_points
          1, // total_races
        ])
      );
    });

    it("should throw error for non-existent competition", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        standingsService.calculate(fakeId, seasonId.toString(), leagueId.toString())
      ).rejects.toThrow(`Competition with id "${fakeId}" not found`);
    });

    it("should return empty standings when no eligible results exist", async () => {
      const competition = await competitionService.create({
        name: "Empty Competition",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
        eligibilityCriteria: {
          racerCriteria: { categories: ["cat1"] },
        },
      });

      const racer = await createPerson({ first: "Wrong Cat" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(0);
    });

    it("should include racer teamId from person organizationIds (Req 6.5)", async () => {
      const teamId = new mongoose.Types.ObjectId();
      const competition = await competitionService.create({
        name: "League",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({
        first: "Team", last: "Racer", organizationIds: [teamId],
      });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].teamId?.toString()).toBe(teamId.toString());
    });
  });

  describe("recalculateAll", () => {
    it("should recalculate standings for all active competitions in a league-season", async () => {
      const comp1 = await competitionService.create({
        name: "Overall",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });
      const comp2 = await competitionService.create({
        name: "TT Cup",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "time" },
        eligibilityCriteria: { raceCriteria: { raceTypes: ["time_trial"] } },
      });

      // Inactive competition - should not be recalculated
      await competitionService.create({
        name: "Inactive",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points" },
        isActive: false,
      });

      const racer = await createPerson({ first: "Test" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace({ raceType: "time_trial" });

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 1800000,
      });

      await standingsService.recalculateAll(seasonId.toString(), leagueId.toString());

      const comp1Standings = await StandingModel.find({ competitionId: comp1._id });
      expect(comp1Standings).toHaveLength(1);
      expect(comp1Standings[0].totalPoints).toBe(25);

      const comp2Standings = await StandingModel.find({ competitionId: comp2._id });
      expect(comp2Standings).toHaveLength(1);
      expect(comp2Standings[0].totalPoints).toBe(1800000);
    });

    it("should also recalculate team-type competitions (Req 6.9)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25, 2: 20 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);

      const team = await OrganizationModel.create({
        name: "Test Team Recalc",
        type: "team",
        memberIds: [racer._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.recalculateAll(seasonId.toString(), leagueId.toString());

      const teamStandings = await TeamStandingModel.find({
        competitionId: competition._id,
      });
      expect(teamStandings).toHaveLength(1);
      expect(teamStandings[0].totalPoints).toBe(25);
      expect(teamStandings[0].organizationId.toString()).toBe(team._id.toString());
    });

    it("should only recalculate competitions for the given league (Req 7.7)", async () => {
      const otherLeagueId = new mongoose.Types.ObjectId();

      // Competition in our league
      const comp = await competitionService.create({
        name: "Our League Comp",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      // Competition in other league
      await CompetitionModel.create({
        name: "Other League Comp",
        leagueId: otherLeagueId,
        seasonId,
        type: "individual",
        scoringMethod: { type: "points", pointsTable: new Map([["1", 25]]) },
        isActive: true,
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.recalculateAll(seasonId.toString(), leagueId.toString());

      // Only our league competition should have standings
      const ourStandings = await StandingModel.find({ competitionId: comp._id });
      expect(ourStandings).toHaveLength(1);

      // No standings for other league competition
      const otherStandings = await StandingModel.find({ leagueId: otherLeagueId });
      expect(otherStandings).toHaveLength(0);
    });
  });

  describe("TimescaleDB error handling", () => {
    it("should not fail standings calculation if TimescaleDB insert fails", async () => {
      mockedQueryWithRetry.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const competition = await competitionService.create({
        name: "League",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      const standings = await standingsService.calculate(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(25);
    });
  });

  describe("calculateTeam", () => {
    afterEach(async () => {
      await OrganizationModel.deleteMany({});
      await TeamStandingModel.deleteMany({});
    });

    it("should compute team standings by summing member points (Req 6.6, 6.7)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25, 2: 20, 3: 16 },
        },
      });

      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);

      const team = await OrganizationModel.create({
        name: "Team Alpha",
        type: "team",
        memberIds: [racer1._id, racer2._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].organizationId.toString()).toBe(team._id.toString());
      expect(standings[0].totalPoints).toBe(45);
      expect(standings[0].totalRaces).toBe(1);
      expect(standings[0].position).toBe(1);
      expect(standings[0].memberResults).toHaveLength(2);
    });

    it("should exclude non-enrolled teams from team standings (Req 7.6)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: {
          type: "points",
          pointsTable: { 1: 25 },
        },
      });

      const racer1 = await createPerson({ first: "Alice" });
      const racer2 = await createPerson({ first: "Bob" });
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);

      const enrolledTeam = await OrganizationModel.create({
        name: "Enrolled Team",
        type: "team",
        memberIds: [racer1._id],
      });
      await enrollOrganization(enrolledTeam._id as mongoose.Types.ObjectId);

      // Non-enrolled team
      await OrganizationModel.create({
        name: "Not Enrolled Team",
        type: "team",
        memberIds: [racer2._id],
      });

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      // Only enrolled team should appear
      expect(standings).toHaveLength(1);
      expect(standings[0].organizationId.toString()).toBe(enrolledTeam._id.toString());
    });

    it("should write leagueId to team standing records", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const team = await OrganizationModel.create({
        name: "Team LeagueId",
        type: "team",
        memberIds: [racer._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      const doc = await TeamStandingModel.findOne({ competitionId: competition._id });
      expect(doc!.leagueId.toString()).toBe(leagueId.toString());
    });

    it("should sort multiple teams by points descending (Req 6.8)", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
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
      await enrollPerson(racer1._id as mongoose.Types.ObjectId);
      await enrollPerson(racer2._id as mongoose.Types.ObjectId);
      await enrollPerson(racer3._id as mongoose.Types.ObjectId);
      await enrollPerson(racer4._id as mongoose.Types.ObjectId);

      const teamAlpha = await OrganizationModel.create({
        name: "Team Alpha",
        type: "team",
        memberIds: [racer1._id, racer2._id],
      });
      await enrollOrganization(teamAlpha._id as mongoose.Types.ObjectId);

      const teamBeta = await OrganizationModel.create({
        name: "Team Beta",
        type: "team",
        memberIds: [racer3._id, racer4._id],
      });
      await enrollOrganization(teamBeta._id as mongoose.Types.ObjectId);

      const race = await createRace();

      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer1._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3500000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer2._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 2, finishTime: 3600000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer3._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 3, finishTime: 3700000,
      });
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer4._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 4, finishTime: 3800000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
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
        standingsService.calculateTeam(fakeId, seasonId.toString(), leagueId.toString())
      ).rejects.toThrow(`Competition with id "${fakeId}" not found`);
    });

    it("should throw error for non-team competition", async () => {
      const competition = await competitionService.create({
        name: "Individual Comp",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      await expect(
        standingsService.calculateTeam(
          competition._id.toString(),
          seasonId.toString(),
          leagueId.toString()
        )
      ).rejects.toThrow(/not a team competition/);
    });

    it("should skip enrolled teams with no members", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const emptyTeam = await OrganizationModel.create({
        name: "Empty Team",
        type: "team",
        memberIds: [],
      });
      await enrollOrganization(emptyTeam._id as mongoose.Types.ObjectId);

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(0);
    });

    it("should insert team standings history into TimescaleDB with leagueId", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const team = await OrganizationModel.create({
        name: "Team History",
        type: "team",
        memberIds: [racer._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(mockedQueryWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO team_standings_history"),
        expect.arrayContaining([
          expect.any(String), // time
          team._id.toString(), // organization_id
          competition._id.toString(), // competition_id
          seasonId.toString(), // season_id
          leagueId.toString(), // league_id
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
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const team = await OrganizationModel.create({
        name: "Team Resilient",
        type: "team",
        memberIds: [racer._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(1);
      expect(standings[0].totalPoints).toBe(25);
    });

    it("should remove team standings for teams no longer qualifying", async () => {
      const competition = await competitionService.create({
        name: "Team Championship",
        leagueId: leagueId.toString(),
        seasonId: seasonId.toString(),
        type: "team",
        scoringMethod: { type: "points", pointsTable: { 1: 25 } },
      });

      const racer = await createPerson({ first: "Racer" });
      await enrollPerson(racer._id as mongoose.Types.ObjectId);
      const team = await OrganizationModel.create({
        name: "Team Remove",
        type: "team",
        memberIds: [racer._id],
      });
      await enrollOrganization(team._id as mongoose.Types.ObjectId);

      const race = await createRace();
      await createRaceResult({
        raceId: race._id as mongoose.Types.ObjectId,
        racerId: racer._id as mongoose.Types.ObjectId,
        seasonId, category: "cat3", position: 1, finishTime: 3600000,
      });

      await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      // Remove all members from team
      await OrganizationModel.findByIdAndUpdate(team._id, {
        $set: { memberIds: [] },
      });

      const standings = await standingsService.calculateTeam(
        competition._id.toString(),
        seasonId.toString(),
        leagueId.toString()
      );

      expect(standings).toHaveLength(0);

      const count = await TeamStandingModel.countDocuments({
        competitionId: competition._id, seasonId,
      });
      expect(count).toBe(0);
    });
  });
});
