import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { LeagueService } from "@/services/league.service";
import { LeagueModel } from "@/models/league.model";

let mongoServer: MongoMemoryServer;
let service: LeagueService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new LeagueService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await LeagueModel.deleteMany({});
});

describe("LeagueService", () => {
  describe("create", () => {
    it("should create a league with a unique name and default branding (Req 1.1)", async () => {
      const league = await service.create({
        name: "Pacific Northwest Racing",
        description: "A regional racing league",
      });

      expect(league.name).toBe("Pacific Northwest Racing");
      expect(league.description).toBe("A regional racing league");
      expect(league.isActive).toBe(true);
      expect(league.branding).toBeDefined();
      expect(league.branding.leagueName).toBe("Pacific Northwest Racing");
      expect(league.branding.mainColors).toHaveLength(3);
      expect(league.branding.accentColors).toHaveLength(1);
      expect(league.branding.logos.square).toBe("/images/default-logo-square.png");
      expect(league.branding.logos.horizontal).toBe("/images/default-logo-horizontal.png");
      expect(league.branding.logos.vertical).toBe("/images/default-logo-vertical.png");
      expect(league.createdAt).toBeInstanceOf(Date);
      expect(league.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a league without a description", async () => {
      const league = await service.create({ name: "Minimal League" });

      expect(league.name).toBe("Minimal League");
      expect(league.description).toBeUndefined();
    });

    it("should reject creation if league name already exists (Req 1.6)", async () => {
      await service.create({ name: "Existing League" });

      await expect(
        service.create({ name: "Existing League" })
      ).rejects.toThrow('A league with the name "Existing League" already exists');
    });

    it("should enforce case-insensitive name uniqueness (Req 1.3)", async () => {
      await service.create({ name: "My League" });

      await expect(service.create({ name: "my league" })).rejects.toThrow(
        'A league with the name "my league" already exists'
      );

      await expect(service.create({ name: "MY LEAGUE" })).rejects.toThrow(
        'A league with the name "MY LEAGUE" already exists'
      );
    });

    it("should set error code to LEAGUE_DUPLICATE_NAME on duplicate", async () => {
      await service.create({ name: "Duplicate League" });

      try {
        await service.create({ name: "Duplicate League" });
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("LEAGUE_DUPLICATE_NAME");
        expect((error as Error & { statusCode: number }).statusCode).toBe(409);
      }
    });

    it("should allow multiple leagues with different names (Req 1.4)", async () => {
      const league1 = await service.create({ name: "League Alpha" });
      const league2 = await service.create({ name: "League Beta" });

      expect(league1.name).toBe("League Alpha");
      expect(league2.name).toBe("League Beta");
    });
  });

  describe("update", () => {
    it("should update league name and description (Req 1.2)", async () => {
      const league = await service.create({
        name: "Original Name",
        description: "Original description",
      });

      const updated = await service.update(league._id.toString(), {
        name: "Updated Name",
        description: "Updated description",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Updated description");
      expect(updated.branding.leagueName).toBe("Updated Name");
    });

    it("should update only the name", async () => {
      const league = await service.create({
        name: "Original",
        description: "Keep this",
      });

      const updated = await service.update(league._id.toString(), {
        name: "New Name",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("Keep this");
    });

    it("should update only the description", async () => {
      const league = await service.create({
        name: "Keep This Name",
        description: "Old description",
      });

      const updated = await service.update(league._id.toString(), {
        description: "New description",
      });

      expect(updated.name).toBe("Keep This Name");
      expect(updated.description).toBe("New description");
    });

    it("should reject update if name conflicts with another league (case-insensitive)", async () => {
      await service.create({ name: "League Alpha" });
      const leagueB = await service.create({ name: "League Beta" });

      await expect(
        service.update(leagueB._id.toString(), { name: "League Alpha" })
      ).rejects.toThrow('A league with the name "League Alpha" already exists');
    });

    it("should allow updating a league to retain its own name", async () => {
      const league = await service.create({ name: "Same Name" });

      const updated = await service.update(league._id.toString(), {
        name: "Same Name",
        description: "New description",
      });

      expect(updated.name).toBe("Same Name");
      expect(updated.description).toBe("New description");
    });

    it("should throw LEAGUE_NOT_FOUND for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      try {
        await service.update(fakeId, { name: "No League" });
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("LEAGUE_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });
  });

  describe("deactivate", () => {
    it("should mark league as inactive (Req 1.5)", async () => {
      const league = await service.create({ name: "Active League" });

      const deactivated = await service.deactivate(league._id.toString());

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.name).toBe("Active League");
    });

    it("should preserve all league data when deactivating", async () => {
      const league = await service.create({
        name: "Full League",
        description: "Has all the data",
      });

      const deactivated = await service.deactivate(league._id.toString());

      expect(deactivated.name).toBe("Full League");
      expect(deactivated.description).toBe("Has all the data");
      expect(deactivated.branding).toBeDefined();
      expect(deactivated.createdAt).toBeInstanceOf(Date);
    });

    it("should throw LEAGUE_NOT_FOUND for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      try {
        await service.deactivate(fakeId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("LEAGUE_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });
  });

  describe("getById", () => {
    it("should return league by ID", async () => {
      const league = await service.create({ name: "Find Me" });

      const found = await service.getById(league._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Find Me");
    });

    it("should return null for non-existent league", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("getByName", () => {
    it("should find league by exact name", async () => {
      await service.create({ name: "Exact Match League" });

      const found = await service.getByName("Exact Match League");

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Exact Match League");
    });

    it("should find league by name case-insensitively", async () => {
      await service.create({ name: "Case Test League" });

      const found = await service.getByName("case test league");

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Case Test League");
    });

    it("should return null if no league matches the name", async () => {
      const found = await service.getByName("Nonexistent League");
      expect(found).toBeNull();
    });
  });

  describe("listAll", () => {
    it("should return all leagues including inactive ones", async () => {
      await service.create({ name: "Active 1" });
      const league2 = await service.create({ name: "Active 2" });
      await service.deactivate(league2._id.toString());

      const all = await service.listAll();

      expect(all).toHaveLength(2);
      const names = all.map((l) => l.name);
      expect(names).toContain("Active 1");
      expect(names).toContain("Active 2");
    });

    it("should return empty array when no leagues exist", async () => {
      const all = await service.listAll();
      expect(all).toHaveLength(0);
    });
  });

  describe("listActive", () => {
    it("should return only active leagues", async () => {
      await service.create({ name: "Active League" });
      const inactive = await service.create({ name: "Inactive League" });
      await service.deactivate(inactive._id.toString());

      const active = await service.listActive();

      expect(active).toHaveLength(1);
      expect(active[0].name).toBe("Active League");
    });

    it("should return leagues sorted by name", async () => {
      await service.create({ name: "Zeta League" });
      await service.create({ name: "Alpha League" });
      await service.create({ name: "Mid League" });

      const active = await service.listActive();

      expect(active).toHaveLength(3);
      expect(active[0].name).toBe("Alpha League");
      expect(active[1].name).toBe("Mid League");
      expect(active[2].name).toBe("Zeta League");
    });

    it("should return empty array when no active leagues exist", async () => {
      const league = await service.create({ name: "Only League" });
      await service.deactivate(league._id.toString());

      const active = await service.listActive();
      expect(active).toHaveLength(0);
    });
  });
});
