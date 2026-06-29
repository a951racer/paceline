import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { RaceResultService } from "@/services/race-result.service";
import { RaceResultModel } from "@/models/race-result.model";
import { RaceModel } from "@/models/race.model";
import { PersonModel } from "@/models/person.model";
import { SeasonModel } from "@/models/season.model";
import { EnrollmentModel } from "@/models/enrollment.model";
import { SeasonService } from "@/services/season.service";
import { RaceService } from "@/services/race.service";
import { EnrollmentService } from "@/services/enrollment.service";
import {
  setOnResultsEnteredCallback,
  onResultsEntered,
} from "@/services/race-result.service";

let mongoServer: MongoMemoryServer;
let service: RaceResultService;
let seasonService: SeasonService;
let raceService: RaceService;
let enrollmentService: EnrollmentService;
const defaultLeagueId = new mongoose.Types.ObjectId().toString();
const adminUserId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new RaceResultService();
  seasonService = new SeasonService();
  raceService = new RaceService();
  enrollmentService = new EnrollmentService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await RaceResultModel.deleteMany({});
  await RaceModel.deleteMany({});
  await PersonModel.deleteMany({});
  await SeasonModel.deleteMany({});
  await EnrollmentModel.deleteMany({});
  setOnResultsEnteredCallback(null);
});

/** Helper to create a season covering 2024 */
async function createSeason2024() {
  return seasonService.create({
    name: "2024 Season",
    leagueId: defaultLeagueId,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });
}

/** Helper to create a race */
async function createRace(seasonId: string) {
  return raceService.create({
    name: "Downtown Crit",
    date: new Date("2024-06-15"),
    location: { name: "City Center" },
    raceType: "crit",
    leagueId: defaultLeagueId,
    categories: ["cat3", "cat4"],
    seasonId,
  });
}

/** Helper to create a person (racer) */
async function createRacer(overrides?: Record<string, unknown>) {
  return PersonModel.create({
    name: { first: "Test", last: "Racer" },
    email: `racer-${Date.now()}-${Math.random()}@example.com`,
    roles: ["racer"],
    category: "cat3",
    isRegistered: true,
    ...overrides,
  });
}

/** Helper to enroll a racer in a league-season */
async function enrollRacer(personId: string, leagueId: string, seasonId: string) {
  return enrollmentService.enrollPerson(personId, leagueId, seasonId, adminUserId);
}

describe("RaceResultService", () => {
  describe("enter", () => {
    it("should enter results for a race (Req 5.1)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season._id.toString());

      const response = await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
          points: 100,
        },
      ]);

      expect(response.successful).toHaveLength(1);
      expect(response.errors).toHaveLength(0);
      expect(response.successful[0].raceId.toString()).toBe(
        race._id.toString()
      );
      expect(response.successful[0].racerId.toString()).toBe(
        racer._id.toString()
      );
      expect(response.successful[0].leagueId.toString()).toBe(defaultLeagueId);
      expect(response.successful[0].seasonId.toString()).toBe(
        season._id.toString()
      );
      expect(response.successful[0].category).toBe("cat3");
      expect(response.successful[0].position).toBe(1);
      expect(response.successful[0].finishTime).toBe(3600000);
      expect(response.successful[0].points).toBe(100);
    });

    it("should enter multiple results in a batch", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer1 = await createRacer({
        name: { first: "Alice", last: "Smith" },
      });
      const racer2 = await createRacer({
        name: { first: "Bob", last: "Jones" },
      });
      await enrollRacer(racer1._id.toString(), defaultLeagueId, season._id.toString());
      await enrollRacer(racer2._id.toString(), defaultLeagueId, season._id.toString());

      const response = await service.enter(race._id.toString(), [
        {
          racerId: racer1._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3500000,
        },
        {
          racerId: racer2._id.toString(),
          category: "cat3",
          position: 2,
          finishTime: 3600000,
        },
      ]);

      expect(response.successful).toHaveLength(2);
      expect(response.errors).toHaveLength(0);
    });

    it("should reject entry for non-existent racer (Req 5.2)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const fakeRacerId = new mongoose.Types.ObjectId().toString();

      const response = await service.enter(race._id.toString(), [
        {
          racerId: fakeRacerId,
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      expect(response.successful).toHaveLength(0);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].racerId).toBe(fakeRacerId);
      expect(response.errors[0].reason).toContain("does not exist");
    });

    it("should reject entry for racer not enrolled in league-season (Req 9.6)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();
      // Racer exists but is NOT enrolled in this league-season

      const response = await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      expect(response.successful).toHaveLength(0);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].racerId).toBe(racer._id.toString());
      expect(response.errors[0].reason).toContain("not enrolled");
    });

    it("should reject duplicate result for same racer and race (Req 5.4)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season._id.toString());

      // First entry succeeds
      await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      // Second entry for same racer+race should be rejected
      const response = await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 2,
          finishTime: 3700000,
        },
      ]);

      expect(response.successful).toHaveLength(0);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].reason).toContain("Duplicate result");
    });

    it("should handle mixed batch with valid and invalid entries", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const validRacer = await createRacer();
      await enrollRacer(validRacer._id.toString(), defaultLeagueId, season._id.toString());
      const fakeRacerId = new mongoose.Types.ObjectId().toString();

      const response = await service.enter(race._id.toString(), [
        {
          racerId: validRacer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3500000,
        },
        {
          racerId: fakeRacerId,
          category: "cat3",
          position: 2,
          finishTime: 3600000,
        },
      ]);

      expect(response.successful).toHaveLength(1);
      expect(response.errors).toHaveLength(1);
    });

    it("should throw if race does not exist", async () => {
      const fakeRaceId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.enter(fakeRaceId, [
          {
            racerId: new mongoose.Types.ObjectId().toString(),
            category: "cat3",
            position: 1,
            finishTime: 3600000,
          },
        ])
      ).rejects.toThrow(`Race with id "${fakeRaceId}" not found`);
    });

    it("should trigger standings recalculation callback after successful entry (Req 5.3)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season._id.toString());

      const mockCallback = jest.fn();
      setOnResultsEnteredCallback(mockCallback);

      await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      expect(mockCallback).toHaveBeenCalledWith(
        race._id.toString(),
        season._id.toString()
      );
    });

    it("should NOT trigger standings recalculation if no results were successfully entered", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const fakeRacerId = new mongoose.Types.ObjectId().toString();

      const mockCallback = jest.fn();
      setOnResultsEnteredCallback(mockCallback);

      await service.enter(race._id.toString(), [
        {
          racerId: fakeRacerId,
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("validate", () => {
    it("should return valid for existing racer with no duplicate", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();

      const result = await service.validate(race._id.toString(), {
        racerId: racer._id.toString(),
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for non-existent racer (Req 5.2)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const fakeRacerId = new mongoose.Types.ObjectId().toString();

      const result = await service.validate(race._id.toString(), {
        racerId: fakeRacerId,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not exist");
    });

    it("should return invalid for duplicate racer in race (Req 5.4)", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season._id.toString());

      // Enter initial result
      await service.enter(race._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3600000,
        },
      ]);

      const result = await service.validate(race._id.toString(), {
        racerId: racer._id.toString(),
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Duplicate result");
    });
  });

  describe("getByRace", () => {
    it("should return all results for a race sorted by position", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());
      const racer1 = await createRacer({
        name: { first: "First", last: "Place" },
      });
      const racer2 = await createRacer({
        name: { first: "Second", last: "Place" },
      });
      const racer3 = await createRacer({
        name: { first: "Third", last: "Place" },
      });
      await enrollRacer(racer1._id.toString(), defaultLeagueId, season._id.toString());
      await enrollRacer(racer2._id.toString(), defaultLeagueId, season._id.toString());
      await enrollRacer(racer3._id.toString(), defaultLeagueId, season._id.toString());

      await service.enter(race._id.toString(), [
        {
          racerId: racer3._id.toString(),
          category: "cat3",
          position: 3,
          finishTime: 3800000,
        },
        {
          racerId: racer1._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3500000,
        },
        {
          racerId: racer2._id.toString(),
          category: "cat3",
          position: 2,
          finishTime: 3600000,
        },
      ]);

      const results = await service.getByRace(race._id.toString());

      expect(results).toHaveLength(3);
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(2);
      expect(results[2].position).toBe(3);
    });

    it("should return empty array for race with no results", async () => {
      const season = await createSeason2024();
      const race = await createRace(season._id.toString());

      const results = await service.getByRace(race._id.toString());

      expect(results).toHaveLength(0);
    });
  });

  describe("getByRacer", () => {
    it("should return racer's results in a season", async () => {
      const season = await createSeason2024();
      const race1 = await raceService.create({
        name: "Race 1",
        date: new Date("2024-03-15"),
        location: { name: "Track A" },
        raceType: "crit",
        leagueId: defaultLeagueId,
        seasonId: season._id.toString(),
      });
      const race2 = await raceService.create({
        name: "Race 2",
        date: new Date("2024-06-15"),
        location: { name: "Track B" },
        raceType: "road_race",
        leagueId: defaultLeagueId,
        seasonId: season._id.toString(),
      });
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season._id.toString());

      await service.enter(race1._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 2,
          finishTime: 3600000,
        },
      ]);
      await service.enter(race2._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3500000,
        },
      ]);

      const results = await service.getByRacer(
        racer._id.toString(),
        season._id.toString()
      );

      expect(results).toHaveLength(2);
    });

    it("should not return results from a different season", async () => {
      const season1 = await seasonService.create({
        name: "2024 Season",
        leagueId: defaultLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      const season2 = await seasonService.create({
        name: "2025 Season",
        leagueId: defaultLeagueId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });
      const race1 = await raceService.create({
        name: "Race in Season 1",
        date: new Date("2024-06-15"),
        location: { name: "Track" },
        raceType: "crit",
        leagueId: defaultLeagueId,
        seasonId: season1._id.toString(),
      });
      const race2 = await raceService.create({
        name: "Race in Season 2",
        date: new Date("2025-06-15"),
        location: { name: "Track" },
        raceType: "crit",
        leagueId: defaultLeagueId,
        seasonId: season2._id.toString(),
      });
      const racer = await createRacer();
      await enrollRacer(racer._id.toString(), defaultLeagueId, season1._id.toString());
      await enrollRacer(racer._id.toString(), defaultLeagueId, season2._id.toString());

      await service.enter(race1._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 1,
          finishTime: 3500000,
        },
      ]);
      await service.enter(race2._id.toString(), [
        {
          racerId: racer._id.toString(),
          category: "cat3",
          position: 2,
          finishTime: 3600000,
        },
      ]);

      const results = await service.getByRacer(
        racer._id.toString(),
        season1._id.toString()
      );

      expect(results).toHaveLength(1);
      expect(results[0].seasonId.toString()).toBe(season1._id.toString());
    });

    it("should return empty array for racer with no results in season", async () => {
      const season = await createSeason2024();
      const racer = await createRacer();

      const results = await service.getByRacer(
        racer._id.toString(),
        season._id.toString()
      );

      expect(results).toHaveLength(0);
    });
  });
});
