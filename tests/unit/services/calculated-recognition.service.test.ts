import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  CalculatedRecognitionService,
  wireRecognitionRecalculation,
  setOnStandingsUpdatedCallback,
  notifyStandingsUpdated,
} from "@/services/calculated-recognition.service";
import {
  CalculatedRecognitionModel,
  EarnedRecognitionModel,
} from "@/models/calculated-recognition.model";
import * as timescaledb from "@/lib/db/timescaledb";

let mongoServer: MongoMemoryServer;
let service: CalculatedRecognitionService;

// Mock TimescaleDB module
jest.mock("@/lib/db/timescaledb", () => ({
  queryWithRetry: jest.fn(),
  getTimescalePool: jest.fn(),
  getClient: jest.fn(),
  withTransaction: jest.fn(),
  disconnectTimescaleDB: jest.fn(),
  getPoolStats: jest.fn(),
}));

const mockQueryWithRetry = timescaledb.queryWithRetry as jest.MockedFunction<
  typeof timescaledb.queryWithRetry
>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new CalculatedRecognitionService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await CalculatedRecognitionModel.deleteMany({});
  await EarnedRecognitionModel.deleteMany({});
  setOnStandingsUpdatedCallback(null);
  jest.clearAllMocks();
});

describe("CalculatedRecognitionService", () => {
  describe("define", () => {
    it("should create a recognition with computation method and criteria (Req 17.1)", async () => {
      const recognition = await service.define({
        name: "Most Improved Rider",
        description: "Greatest improvement in standings position over 30 days",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/badge-improved.png",
        isActive: true,
      });

      expect(recognition).toBeDefined();
      expect(recognition.name).toBe("Most Improved Rider");
      expect(recognition.description).toBe(
        "Greatest improvement in standings position over 30 days"
      );
      expect(recognition.computationMethod).toBe("most_improved");
      expect(recognition.criteria.timePeriodDays).toBe(30);
      expect(recognition.badgeUrl).toBe(
        "https://example.com/badge-improved.png"
      );
      expect(recognition.isActive).toBe(true);
      expect(recognition.createdAt).toBeInstanceOf(Date);
    });

    it("should create a custom recognition (Req 17.8)", async () => {
      const recognition = await service.define({
        name: "Sprint King",
        description: "Custom recognition for sprint performance",
        computationMethod: "custom",
        criteria: { customFormula: "sprint_points_avg > 10" },
        badgeUrl: "https://example.com/badge-sprint.png",
        isActive: true,
      });

      expect(recognition.computationMethod).toBe("custom");
      expect(recognition.criteria.customFormula).toBe(
        "sprint_points_avg > 10"
      );
    });

    it("should default isActive to true", async () => {
      const recognition = await service.define({
        name: "Biggest Mover",
        description: "Largest position jump in a single period",
        computationMethod: "biggest_mover",
        criteria: { timePeriodDays: 14 },
        badgeUrl: "https://example.com/badge-mover.png",
      });

      expect(recognition.isActive).toBe(true);
    });
  });

  describe("compute", () => {
    it("should run all active recognitions for the season (Req 17.4)", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();

      // Create two active recognitions
      await service.define({
        name: "Most Improved Rider",
        description: "Greatest improvement in standings",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/badge1.png",
        isActive: true,
      });

      await service.define({
        name: "Biggest Mover",
        description: "Largest single-period position change",
        computationMethod: "biggest_mover",
        criteria: { timePeriodDays: 14 },
        badgeUrl: "https://example.com/badge2.png",
        isActive: true,
      });

      // Mock TimescaleDB responses
      const personId = new mongoose.Types.ObjectId().toString();
      mockQueryWithRetry
        .mockResolvedValueOnce({
          rows: [
            {
              person_id: personId,
              earliest_position: 10,
              latest_position: 3,
              improvement: 7,
            },
          ],
          command: "SELECT",
          rowCount: 1,
          oid: 0,
          fields: [],
        } as never)
        .mockResolvedValueOnce({
          rows: [
            {
              person_id: personId,
              biggest_move: 5,
            },
          ],
          command: "SELECT",
          rowCount: 1,
          oid: 0,
          fields: [],
        } as never);

      const results = await service.compute(seasonId, leagueId);

      expect(results).toHaveLength(2);
      expect(results[0].personId.toString()).toBe(personId);
      expect(results[0].computedValue).toBe(7);
      expect(results[0].leagueId.toString()).toBe(leagueId);
      expect(results[1].personId.toString()).toBe(personId);
      expect(results[1].computedValue).toBe(5);
      expect(results[1].leagueId.toString()).toBe(leagueId);
    });

    it("should skip inactive recognitions", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();

      await service.define({
        name: "Inactive Recognition",
        description: "Should not be computed",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/badge.png",
        isActive: false,
      });

      const results = await service.compute(seasonId, leagueId);

      expect(results).toHaveLength(0);
      expect(mockQueryWithRetry).not.toHaveBeenCalled();
    });

    it("should replace previous earned recognition on recomputation", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();
      const personId1 = new mongoose.Types.ObjectId().toString();
      const personId2 = new mongoose.Types.ObjectId().toString();

      await service.define({
        name: "Most Improved Rider",
        description: "Greatest improvement",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/badge.png",
        isActive: true,
      });

      // First computation - person1 wins
      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: personId1,
            earliest_position: 8,
            latest_position: 2,
            improvement: 6,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      await service.compute(seasonId, leagueId);

      let earned = await EarnedRecognitionModel.find({ seasonId, leagueId });
      expect(earned).toHaveLength(1);
      expect(earned[0].personId.toString()).toBe(personId1);

      // Second computation - person2 now wins
      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: personId2,
            earliest_position: 12,
            latest_position: 1,
            improvement: 11,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      await service.compute(seasonId, leagueId);

      earned = await EarnedRecognitionModel.find({ seasonId, leagueId });
      expect(earned).toHaveLength(1);
      expect(earned[0].personId.toString()).toBe(personId2);
      expect(earned[0].computedValue).toBe(11);
    });
  });

  describe("getMostImproved", () => {
    it("should return the racer with greatest position improvement (Req 17.2)", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const personId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: personId,
            earliest_position: 15,
            latest_position: 5,
            improvement: 10,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      const result = await service.getMostImproved(seasonId, 30);

      expect(result).not.toBeNull();
      expect(result!.personId).toBe(personId);
      expect(result!.computedValue).toBe(10);
    });

    it("should return null when no standings history exists", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [],
        command: "SELECT",
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never);

      const result = await service.getMostImproved(seasonId, 30);

      expect(result).toBeNull();
    });

    it("should return null when no one has improved", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: "abc",
            earliest_position: 3,
            latest_position: 5,
            improvement: -2,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      const result = await service.getMostImproved(seasonId, 30);

      expect(result).toBeNull();
    });

    it("should handle TimescaleDB errors gracefully", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const result = await service.getMostImproved(seasonId, 30);

      expect(result).toBeNull();
    });
  });

  describe("getBiggestMover", () => {
    it("should return the racer with largest single-period position change (Req 17.3)", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const personId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: personId,
            biggest_move: 8,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      const result = await service.getBiggestMover(seasonId, 14);

      expect(result).not.toBeNull();
      expect(result!.personId).toBe(personId);
      expect(result!.computedValue).toBe(8);
    });

    it("should return null when no standings history exists", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [],
        command: "SELECT",
        rowCount: 0,
        oid: 0,
        fields: [],
      } as never);

      const result = await service.getBiggestMover(seasonId, 14);

      expect(result).toBeNull();
    });

    it("should handle TimescaleDB errors gracefully", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();

      mockQueryWithRetry.mockRejectedValueOnce(
        new Error("Connection timeout")
      );

      const result = await service.getBiggestMover(seasonId, 14);

      expect(result).toBeNull();
    });
  });

  describe("wireRecognitionRecalculation", () => {
    it("should trigger recognition computation when standings are updated (Req 17.4)", async () => {
      const seasonId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();

      // Create an active recognition
      await service.define({
        name: "Most Improved Rider",
        description: "Greatest improvement",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/badge.png",
        isActive: true,
      });

      const personId = new mongoose.Types.ObjectId().toString();
      mockQueryWithRetry.mockResolvedValueOnce({
        rows: [
          {
            person_id: personId,
            earliest_position: 10,
            latest_position: 2,
            improvement: 8,
          },
        ],
        command: "SELECT",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as never);

      // Wire recalculation
      wireRecognitionRecalculation();

      // Simulate standings update notification
      notifyStandingsUpdated(seasonId, leagueId);

      // Wait for the async callback to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify recognition was computed and stored
      const earned = await EarnedRecognitionModel.find({ seasonId });
      expect(earned).toHaveLength(1);
      expect(earned[0].personId.toString()).toBe(personId);
      expect(earned[0].computedValue).toBe(8);
      expect(earned[0].leagueId.toString()).toBe(leagueId);
    });
  });

  describe("notifyStandingsUpdated", () => {
    it("should not throw when no callback is set", () => {
      setOnStandingsUpdatedCallback(null);
      expect(() => notifyStandingsUpdated("some-season-id", "some-league-id")).not.toThrow();
    });

    it("should call the registered callback with seasonId and leagueId", () => {
      const mockCallback = jest.fn();
      setOnStandingsUpdatedCallback(mockCallback);

      notifyStandingsUpdated("test-season-id", "test-league-id");

      expect(mockCallback).toHaveBeenCalledWith("test-season-id", "test-league-id");
    });
  });
});
