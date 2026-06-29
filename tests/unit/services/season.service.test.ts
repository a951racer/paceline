import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { SeasonService } from "@/services/season.service";
import { SeasonModel } from "@/models/season.model";

let mongoServer: MongoMemoryServer;
let service: SeasonService;

// Use a fixed leagueId for most tests
const leagueId = new mongoose.Types.ObjectId().toString();
const otherLeagueId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new SeasonService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await SeasonModel.deleteMany({});
});

describe("SeasonService", () => {
  describe("create", () => {
    it("should create a season with name, leagueId, startDate, and endDate (Req 2.1)", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      expect(season.name).toBe("2024 Season");
      expect(season.leagueId.toString()).toBe(leagueId);
      expect(season.startDate).toEqual(new Date("2024-01-01"));
      expect(season.endDate).toEqual(new Date("2024-12-31"));
      expect(season.isActive).toBe(false);
      expect(season.createdAt).toBeInstanceOf(Date);
      expect(season.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a season with isActive flag when no other active season in league", async () => {
      const season = await service.create({
        name: "Active Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      expect(season.isActive).toBe(true);
    });

    it("should reject creation with isActive if another season in same league is active (Req 2.4)", async () => {
      await service.create({
        name: "Active Season",
        leagueId,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        isActive: true,
      });

      await expect(
        service.create({
          name: "Another Active Season",
          leagueId,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          isActive: true,
        })
      ).rejects.toThrow(
        "Cannot activate season; another season in this league is already active."
      );
    });

    it("should allow creating active season in different league even if another league has active season", async () => {
      await service.create({
        name: "League A Active",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const season = await service.create({
        name: "League B Active",
        leagueId: otherLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      expect(season.isActive).toBe(true);
    });

    it("should reject creation if date range overlaps with existing season in same league (Req 2.5)", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await expect(
        service.create({
          name: "Overlapping Season",
          leagueId,
          startDate: new Date("2024-06-01"),
          endDate: new Date("2025-06-30"),
        })
      ).rejects.toThrow(
        "Season date range overlaps with an existing season in this league"
      );
    });

    it("should allow creation if date range overlaps but in different league (Req 2.6)", async () => {
      await service.create({
        name: "2024 Season League A",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const season = await service.create({
        name: "2024 Season League B",
        leagueId: otherLeagueId,
        startDate: new Date("2024-06-01"),
        endDate: new Date("2025-06-30"),
      });

      expect(season.name).toBe("2024 Season League B");
    });

    it("should allow creation if date range does not overlap in same league", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const season2025 = await service.create({
        name: "2025 Season",
        leagueId,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(season2025.name).toBe("2025 Season");
    });

    it("should reject creation if endDate is before startDate", async () => {
      await expect(
        service.create({
          name: "Invalid Season",
          leagueId,
          startDate: new Date("2024-12-31"),
          endDate: new Date("2024-01-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should reject creation if endDate equals startDate", async () => {
      await expect(
        service.create({
          name: "Zero-length Season",
          leagueId,
          startDate: new Date("2024-06-01"),
          endDate: new Date("2024-06-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should detect overlap when new season starts on same day existing ends in same league", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      // Starts on the same day the existing season ends - this overlaps
      await expect(
        service.create({
          name: "Boundary Season",
          leagueId,
          startDate: new Date("2024-12-31"),
          endDate: new Date("2025-06-30"),
        })
      ).rejects.toThrow(
        "Season date range overlaps with an existing season in this league"
      );
    });

    it("should detect overlap when new season is fully contained within existing in same league", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await expect(
        service.create({
          name: "Contained Season",
          leagueId,
          startDate: new Date("2024-03-01"),
          endDate: new Date("2024-06-30"),
        })
      ).rejects.toThrow(
        "Season date range overlaps with an existing season in this league"
      );
    });
  });

  describe("getActive", () => {
    it("should return the active season for a specific league (Req 2.4)", async () => {
      await service.create({
        name: "Inactive Season",
        leagueId,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      });

      await service.create({
        name: "Active Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const active = await service.getActive(leagueId);

      expect(active).not.toBeNull();
      expect(active!.name).toBe("Active Season");
      expect(active!.isActive).toBe(true);
    });

    it("should return null when no season is active in the league", async () => {
      await service.create({
        name: "Inactive Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const active = await service.getActive(leagueId);
      expect(active).toBeNull();
    });

    it("should not return active season from a different league", async () => {
      await service.create({
        name: "Active in Other League",
        leagueId: otherLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const active = await service.getActive(leagueId);
      expect(active).toBeNull();
    });

    it("should return correct active season when multiple leagues have active seasons", async () => {
      await service.create({
        name: "League A Active",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      await service.create({
        name: "League B Active",
        leagueId: otherLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const activeA = await service.getActive(leagueId);
      const activeB = await service.getActive(otherLeagueId);

      expect(activeA!.name).toBe("League A Active");
      expect(activeB!.name).toBe("League B Active");
    });
  });

  describe("validateNoOverlap", () => {
    it("should return true when no overlap exists in the league", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const isValid = await service.validateNoOverlap(
        leagueId,
        new Date("2025-01-01"),
        new Date("2025-12-31")
      );

      expect(isValid).toBe(true);
    });

    it("should return false when overlap exists in the same league", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const isValid = await service.validateNoOverlap(
        leagueId,
        new Date("2024-06-01"),
        new Date("2025-06-30")
      );

      expect(isValid).toBe(false);
    });

    it("should return true when overlap exists but in different league (Req 2.6)", async () => {
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const isValid = await service.validateNoOverlap(
        otherLeagueId,
        new Date("2024-06-01"),
        new Date("2025-06-30")
      );

      expect(isValid).toBe(true);
    });

    it("should exclude a specific season from overlap check", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      // Same range should be valid if we exclude the season itself
      const isValid = await service.validateNoOverlap(
        leagueId,
        new Date("2024-01-01"),
        new Date("2024-12-31"),
        season._id.toString()
      );

      expect(isValid).toBe(true);
    });

    it("should return true when no seasons exist in the league", async () => {
      const isValid = await service.validateNoOverlap(
        leagueId,
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );

      expect(isValid).toBe(true);
    });
  });

  describe("markInactive", () => {
    it("should set isActive to false for a season", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const deactivated = await service.markInactive(season._id.toString());

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.name).toBe("2024 Season");
    });

    it("should preserve historical data when marking inactive", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const deactivated = await service.markInactive(season._id.toString());

      expect(deactivated.name).toBe("2024 Season");
      expect(deactivated.startDate).toEqual(new Date("2024-01-01"));
      expect(deactivated.endDate).toEqual(new Date("2024-12-31"));
      expect(deactivated.createdAt).toBeInstanceOf(Date);
    });

    it("should throw error for non-existent season", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(service.markInactive(fakeId)).rejects.toThrow(
        `Season with id "${fakeId}" not found`
      );
    });
  });

  describe("activate", () => {
    it("should activate a season when no other active season in the same league (Req 2.4)", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const activated = await service.activate(season._id.toString());

      expect(activated.isActive).toBe(true);
      expect(activated.name).toBe("2024 Season");
    });

    it("should reject activation if another season in the same league is already active", async () => {
      await service.create({
        name: "2023 Season",
        leagueId,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        isActive: true,
      });

      const season2 = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await expect(service.activate(season2._id.toString())).rejects.toThrow(
        "Cannot activate season; another season in this league is already active."
      );
    });

    it("should allow activation if active season is in a different league", async () => {
      await service.create({
        name: "Other League Active",
        leagueId: otherLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const season = await service.create({
        name: "This League Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const activated = await service.activate(season._id.toString());
      expect(activated.isActive).toBe(true);
    });

    it("should throw error for non-existent season", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(service.activate(fakeId)).rejects.toThrow(
        `Season with id "${fakeId}" not found`
      );
    });
  });

  describe("getById", () => {
    it("should return season by ID", async () => {
      const season = await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const found = await service.getById(season._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe("2024 Season");
      expect(found!.leagueId.toString()).toBe(leagueId);
    });

    it("should return null for non-existent season", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return seasons for the specified league sorted by startDate descending", async () => {
      await service.create({
        name: "2022 Season",
        leagueId,
        startDate: new Date("2022-01-01"),
        endDate: new Date("2022-12-31"),
      });
      await service.create({
        name: "2024 Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      await service.create({
        name: "2023 Season",
        leagueId,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      });

      const seasons = await service.list(leagueId);

      expect(seasons).toHaveLength(3);
      expect(seasons[0].name).toBe("2024 Season");
      expect(seasons[1].name).toBe("2023 Season");
      expect(seasons[2].name).toBe("2022 Season");
    });

    it("should not return seasons from other leagues", async () => {
      await service.create({
        name: "League A Season",
        leagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      await service.create({
        name: "League B Season",
        leagueId: otherLeagueId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const seasonsA = await service.list(leagueId);
      const seasonsB = await service.list(otherLeagueId);

      expect(seasonsA).toHaveLength(1);
      expect(seasonsA[0].name).toBe("League A Season");
      expect(seasonsB).toHaveLength(1);
      expect(seasonsB[0].name).toBe("League B Season");
    });

    it("should return empty array when no seasons exist for the league", async () => {
      const seasons = await service.list(leagueId);
      expect(seasons).toHaveLength(0);
    });
  });
});
