import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ReferenceDataService } from "@/services/reference-data.service";
import { ReferenceDataModel } from "@/models/reference-data.model";

let mongoServer: MongoMemoryServer;
let service: ReferenceDataService;
let leagueId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new ReferenceDataService();
  leagueId = new mongoose.Types.ObjectId().toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await ReferenceDataModel.deleteMany({});
});

describe("ReferenceDataService", () => {
  describe("resolveKeys", () => {
    it("should return labels for keys that exist as active items (Req 9.2)", async () => {
      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "Category 1",
      });
      await service.create({
        leagueId,
        type: "category",
        key: "cat2",
        label: "Category 2",
      });

      const result = await service.resolveKeys(leagueId, "category", [
        "cat1",
        "cat2",
      ]);

      expect(result.get("cat1")).toBe("Category 1");
      expect(result.get("cat2")).toBe("Category 2");
    });

    it("should return labels for keys that exist as inactive items (Req 9.3)", async () => {
      const item = await service.create({
        leagueId,
        type: "race_type",
        key: "crit",
        label: "Criterium",
      });
      await service.deactivate(item._id.toString());

      const result = await service.resolveKeys(leagueId, "race_type", ["crit"]);

      expect(result.get("crit")).toBe("Criterium");
    });

    it("should return the raw key string for unmatched keys (Req 9.4)", async () => {
      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "Category 1",
      });

      const result = await service.resolveKeys(leagueId, "category", [
        "cat1",
        "nonexistent_key",
      ]);

      expect(result.get("cat1")).toBe("Category 1");
      expect(result.get("nonexistent_key")).toBe("nonexistent_key");
    });

    it("should return an empty map when given an empty keys array", async () => {
      const result = await service.resolveKeys(leagueId, "category", []);

      expect(result.size).toBe(0);
    });

    it("should resolve keys scoped to the correct league (Req 9.1)", async () => {
      const otherLeagueId = new mongoose.Types.ObjectId().toString();

      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "League A - Category 1",
      });
      await service.create({
        leagueId: otherLeagueId,
        type: "category",
        key: "cat1",
        label: "League B - Category 1",
      });

      const resultA = await service.resolveKeys(leagueId, "category", ["cat1"]);
      const resultB = await service.resolveKeys(otherLeagueId, "category", [
        "cat1",
      ]);

      expect(resultA.get("cat1")).toBe("League A - Category 1");
      expect(resultB.get("cat1")).toBe("League B - Category 1");
    });

    it("should handle a mix of matching and non-matching keys", async () => {
      await service.create({
        leagueId,
        type: "organization_type",
        key: "team",
        label: "Team",
      });

      const result = await service.resolveKeys(
        leagueId,
        "organization_type",
        ["team", "unknown1", "unknown2"]
      );

      expect(result.get("team")).toBe("Team");
      expect(result.get("unknown1")).toBe("unknown1");
      expect(result.get("unknown2")).toBe("unknown2");
      expect(result.size).toBe(3);
    });
  });

  describe("validateKeys", () => {
    it("should return true when all keys exist as active items (Req 9.5)", async () => {
      await service.create({
        leagueId,
        type: "person_type",
        key: "racer",
        label: "Racer",
      });
      await service.create({
        leagueId,
        type: "person_type",
        key: "volunteer",
        label: "Volunteer",
      });

      const result = await service.validateKeys(leagueId, "person_type", [
        "racer",
        "volunteer",
      ]);

      expect(result).toBe(true);
    });

    it("should return false when any key does not exist", async () => {
      await service.create({
        leagueId,
        type: "person_type",
        key: "racer",
        label: "Racer",
      });

      const result = await service.validateKeys(leagueId, "person_type", [
        "racer",
        "nonexistent",
      ]);

      expect(result).toBe(false);
    });

    it("should return false when a key exists but is inactive (Req 9.5)", async () => {
      const item = await service.create({
        leagueId,
        type: "race_type",
        key: "crit",
        label: "Criterium",
      });
      await service.deactivate(item._id.toString());

      const result = await service.validateKeys(leagueId, "race_type", [
        "crit",
      ]);

      expect(result).toBe(false);
    });

    it("should return true for an empty keys array", async () => {
      const result = await service.validateKeys(leagueId, "category", []);

      expect(result).toBe(true);
    });

    it("should validate keys scoped to the correct league", async () => {
      const otherLeagueId = new mongoose.Types.ObjectId().toString();

      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "Category 1",
      });

      // cat1 exists in leagueId but NOT in otherLeagueId
      const resultA = await service.validateKeys(leagueId, "category", [
        "cat1",
      ]);
      const resultB = await service.validateKeys(otherLeagueId, "category", [
        "cat1",
      ]);

      expect(resultA).toBe(true);
      expect(resultB).toBe(false);
    });

    it("should handle duplicate keys in the input array", async () => {
      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "Category 1",
      });

      const result = await service.validateKeys(leagueId, "category", [
        "cat1",
        "cat1",
      ]);

      expect(result).toBe(true);
    });

    it("should return false when keys exist but for a different type", async () => {
      await service.create({
        leagueId,
        type: "category",
        key: "cat1",
        label: "Category 1",
      });

      const result = await service.validateKeys(leagueId, "race_type", [
        "cat1",
      ]);

      expect(result).toBe(false);
    });
  });

  describe("seedDefaults", () => {
    it("should create default items for all four types (Req 12.1, 12.2, 12.3, 12.4)", async () => {
      const newLeagueId = new mongoose.Types.ObjectId().toString();

      await service.seedDefaults(newLeagueId);

      const categories = await service.listAll(newLeagueId, "category");
      const raceTypes = await service.listAll(newLeagueId, "race_type");
      const orgTypes = await service.listAll(newLeagueId, "organization_type");
      const personTypes = await service.listAll(newLeagueId, "person_type");

      expect(categories).toHaveLength(6);
      expect(raceTypes).toHaveLength(6);
      expect(orgTypes).toHaveLength(4);
      expect(personTypes).toHaveLength(4);
    });

    it("should assign correct labels and sort orders (Req 12.5)", async () => {
      const newLeagueId = new mongoose.Types.ObjectId().toString();

      await service.seedDefaults(newLeagueId);

      const categories = await service.listAll(newLeagueId, "category");
      expect(categories[0].key).toBe("cat1");
      expect(categories[0].label).toBe("Category 1");
      expect(categories[0].sortOrder).toBe(1);
      expect(categories[5].key).toBe("beginner");
      expect(categories[5].label).toBe("Beginner");
      expect(categories[5].sortOrder).toBe(6);

      const raceTypes = await service.listAll(newLeagueId, "race_type");
      expect(raceTypes[0].key).toBe("crit");
      expect(raceTypes[0].label).toBe("Criterium");
      expect(raceTypes[1].key).toBe("time_trial");
      expect(raceTypes[1].label).toBe("Time Trial");
    });

    it("should be idempotent - skip types that already have items (Req 10.7)", async () => {
      const newLeagueId = new mongoose.Types.ObjectId().toString();

      // Pre-create a category item
      await service.create({
        leagueId: newLeagueId,
        type: "category",
        key: "custom_cat",
        label: "Custom Category",
        sortOrder: 1,
      });

      await service.seedDefaults(newLeagueId);

      // Categories should NOT have been seeded (already had items)
      const categories = await service.listAll(newLeagueId, "category");
      expect(categories).toHaveLength(1);
      expect(categories[0].key).toBe("custom_cat");

      // Other types should have been seeded
      const raceTypes = await service.listAll(newLeagueId, "race_type");
      expect(raceTypes).toHaveLength(6);
    });

    it("should create all items as active", async () => {
      const newLeagueId = new mongoose.Types.ObjectId().toString();

      await service.seedDefaults(newLeagueId);

      const allItems = await ReferenceDataModel.find({ leagueId: newLeagueId });
      expect(allItems.every((item) => item.isActive === true)).toBe(true);
    });
  });
});
