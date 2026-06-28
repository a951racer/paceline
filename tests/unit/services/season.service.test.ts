import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { SeasonService } from "@/services/season.service";
import { SeasonModel } from "@/models/season.model";

let mongoServer: MongoMemoryServer;
let service: SeasonService;

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
    it("should create a season with name, startDate, and endDate (Req 18.1)", async () => {
      const season = await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      expect(season.name).toBe("2024 Season");
      expect(season.startDate).toEqual(new Date("2024-01-01"));
      expect(season.endDate).toEqual(new Date("2024-12-31"));
      expect(season.isActive).toBe(false);
      expect(season.createdAt).toBeInstanceOf(Date);
      expect(season.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a season with isActive flag", async () => {
      const season = await service.create({
        name: "Active Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      expect(season.isActive).toBe(true);
    });

    it("should reject creation if date range overlaps with existing season (Req 18.3)", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await expect(
        service.create({
          name: "Overlapping Season",
          startDate: new Date("2024-06-01"),
          endDate: new Date("2025-06-30"),
        })
      ).rejects.toThrow("Season date range overlaps with an existing season");
    });

    it("should allow creation if date range does not overlap", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const season2025 = await service.create({
        name: "2025 Season",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(season2025.name).toBe("2025 Season");
    });

    it("should reject creation if endDate is before startDate", async () => {
      await expect(
        service.create({
          name: "Invalid Season",
          startDate: new Date("2024-12-31"),
          endDate: new Date("2024-01-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should reject creation if endDate equals startDate", async () => {
      await expect(
        service.create({
          name: "Zero-length Season",
          startDate: new Date("2024-06-01"),
          endDate: new Date("2024-06-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should detect overlap when new season starts on same day existing ends", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      // Starts on the same day the existing season ends - this overlaps
      await expect(
        service.create({
          name: "Boundary Season",
          startDate: new Date("2024-12-31"),
          endDate: new Date("2025-06-30"),
        })
      ).rejects.toThrow("Season date range overlaps with an existing season");
    });

    it("should detect overlap when new season is fully contained within existing", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await expect(
        service.create({
          name: "Contained Season",
          startDate: new Date("2024-03-01"),
          endDate: new Date("2024-06-30"),
        })
      ).rejects.toThrow("Season date range overlaps with an existing season");
    });
  });

  describe("getActive", () => {
    it("should return the active season (Req 18.2)", async () => {
      await service.create({
        name: "Inactive Season",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      });

      await service.create({
        name: "Active Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
      });

      const active = await service.getActive();

      expect(active).not.toBeNull();
      expect(active!.name).toBe("Active Season");
      expect(active!.isActive).toBe(true);
    });

    it("should return null when no season is active", async () => {
      await service.create({
        name: "Inactive Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const active = await service.getActive();
      expect(active).toBeNull();
    });
  });

  describe("validateNoOverlap", () => {
    it("should return true when no overlap exists", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const isValid = await service.validateNoOverlap(
        new Date("2025-01-01"),
        new Date("2025-12-31")
      );

      expect(isValid).toBe(true);
    });

    it("should return false when overlap exists", async () => {
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const isValid = await service.validateNoOverlap(
        new Date("2024-06-01"),
        new Date("2025-06-30")
      );

      expect(isValid).toBe(false);
    });

    it("should exclude a specific season from overlap check", async () => {
      const season = await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      // Same range should be valid if we exclude the season itself
      const isValid = await service.validateNoOverlap(
        new Date("2024-01-01"),
        new Date("2024-12-31"),
        season._id.toString()
      );

      expect(isValid).toBe(true);
    });

    it("should return true when no seasons exist", async () => {
      const isValid = await service.validateNoOverlap(
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );

      expect(isValid).toBe(true);
    });
  });

  describe("markInactive", () => {
    it("should set isActive to false for a season (Req 18.4)", async () => {
      const season = await service.create({
        name: "2024 Season",
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
    it("should activate a season and deactivate all others (Req 18.2)", async () => {
      const season1 = await service.create({
        name: "2023 Season",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        isActive: true,
      });

      const season2 = await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const activated = await service.activate(season2._id.toString());

      expect(activated.isActive).toBe(true);
      expect(activated.name).toBe("2024 Season");

      // Verify old season was deactivated
      const oldSeason = await service.getById(season1._id.toString());
      expect(oldSeason!.isActive).toBe(false);
    });

    it("should ensure only one season is active after activation", async () => {
      const season1 = await service.create({
        name: "2022 Season",
        startDate: new Date("2022-01-01"),
        endDate: new Date("2022-12-31"),
        isActive: true,
      });

      const season2 = await service.create({
        name: "2023 Season",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      });

      const season3 = await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      await service.activate(season3._id.toString());

      const allSeasons = await service.list();
      const activeSeasons = allSeasons.filter((s) => s.isActive);
      expect(activeSeasons).toHaveLength(1);
      expect(activeSeasons[0].name).toBe("2024 Season");
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
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });

      const found = await service.getById(season._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe("2024 Season");
    });

    it("should return null for non-existent season", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return all seasons sorted by startDate descending", async () => {
      await service.create({
        name: "2022 Season",
        startDate: new Date("2022-01-01"),
        endDate: new Date("2022-12-31"),
      });
      await service.create({
        name: "2024 Season",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      await service.create({
        name: "2023 Season",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
      });

      const seasons = await service.list();

      expect(seasons).toHaveLength(3);
      expect(seasons[0].name).toBe("2024 Season");
      expect(seasons[1].name).toBe("2023 Season");
      expect(seasons[2].name).toBe("2022 Season");
    });

    it("should return empty array when no seasons exist", async () => {
      const seasons = await service.list();
      expect(seasons).toHaveLength(0);
    });
  });
});
