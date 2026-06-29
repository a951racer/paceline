import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { LeagueAuthorizationService } from "@/services/league-authorization.service";
import { PersonModel } from "@/models/person.model";
import { connectMongoDB } from "@/lib/db/mongodb";

let mongoServer: MongoMemoryServer;
let service: LeagueAuthorizationService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await connectMongoDB();
  service = new LeagueAuthorizationService();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await PersonModel.deleteMany({});
});

/** Helper to create a person with specific admin configuration */
async function createPerson(overrides: Record<string, unknown> = {}) {
  return PersonModel.create({
    name: { first: "Test", last: "User" },
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    roles: [],
    ...overrides,
  });
}

describe("LeagueAuthorizationService", () => {
  // Increase timeout for all tests - MongoMemoryServer can be slow on first operations
  jest.setTimeout(15000);

  describe("isSuperAdmin", () => {
    it("should return true for a person with adminScope.type === 'super' (Req 12.1)", async () => {
      const person = await createPerson({
        roles: ["super_administrator"],
        adminScope: { type: "super" },
      });

      const result = await service.isSuperAdmin(person._id.toString());
      expect(result).toBe(true);
    });

    it("should return false for a person with adminScope.type === 'league'", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [leagueId] },
      });

      const result = await service.isSuperAdmin(person._id.toString());
      expect(result).toBe(false);
    });

    it("should return false for a person with no adminScope", async () => {
      const person = await createPerson({ roles: ["racer"] });

      const result = await service.isSuperAdmin(person._id.toString());
      expect(result).toBe(false);
    });

    it("should return false for a non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await service.isSuperAdmin(fakeId);
      expect(result).toBe(false);
    });
  });

  describe("isLeagueAdmin", () => {
    it("should return true when user is league_admin for the specified league (Req 12.2)", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [leagueId] },
      });

      const result = await service.isLeagueAdmin(
        person._id.toString(),
        leagueId.toString()
      );
      expect(result).toBe(true);
    });

    it("should return false when user is league_admin for a different league (Req 12.6)", async () => {
      const assignedLeague = new mongoose.Types.ObjectId();
      const otherLeague = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [assignedLeague] },
      });

      const result = await service.isLeagueAdmin(
        person._id.toString(),
        otherLeague.toString()
      );
      expect(result).toBe(false);
    });

    it("should return true when league is among multiple assigned leagues (Req 12.4)", async () => {
      const league1 = new mongoose.Types.ObjectId();
      const league2 = new mongoose.Types.ObjectId();
      const league3 = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [league1, league2, league3] },
      });

      const result = await service.isLeagueAdmin(
        person._id.toString(),
        league2.toString()
      );
      expect(result).toBe(true);
    });

    it("should return false for a super_admin (not league-scoped)", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["super_administrator"],
        adminScope: { type: "super" },
      });

      const result = await service.isLeagueAdmin(
        person._id.toString(),
        leagueId.toString()
      );
      expect(result).toBe(false);
    });

    it("should return false for a person with no adminScope", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({ roles: ["racer"] });

      const result = await service.isLeagueAdmin(
        person._id.toString(),
        leagueId.toString()
      );
      expect(result).toBe(false);
    });

    it("should return false for a non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();
      const result = await service.isLeagueAdmin(fakeId, leagueId);
      expect(result).toBe(false);
    });
  });

  describe("canAccessLeague", () => {
    it("should return true for super_admin regardless of league (Req 12.1)", async () => {
      const person = await createPerson({
        roles: ["super_administrator"],
        adminScope: { type: "super" },
      });
      const randomLeague = new mongoose.Types.ObjectId().toString();

      const result = await service.canAccessLeague(
        person._id.toString(),
        randomLeague
      );
      expect(result).toBe(true);
    });

    it("should return true for league_admin on their assigned league (Req 12.5)", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [leagueId] },
      });

      const result = await service.canAccessLeague(
        person._id.toString(),
        leagueId.toString()
      );
      expect(result).toBe(true);
    });

    it("should return false for league_admin on unassigned league (Req 12.6)", async () => {
      const assignedLeague = new mongoose.Types.ObjectId();
      const unassignedLeague = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [assignedLeague] },
      });

      const result = await service.canAccessLeague(
        person._id.toString(),
        unassignedLeague.toString()
      );
      expect(result).toBe(false);
    });

    it("should return false for a regular user with no admin role", async () => {
      const person = await createPerson({ roles: ["racer"] });
      const leagueId = new mongoose.Types.ObjectId().toString();

      const result = await service.canAccessLeague(
        person._id.toString(),
        leagueId
      );
      expect(result).toBe(false);
    });

    it("should return false for a non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();

      const result = await service.canAccessLeague(fakeId, leagueId);
      expect(result).toBe(false);
    });
  });

  describe("getAdminLeagues", () => {
    it("should return assigned league IDs for league_admin (Req 12.4, 12.9)", async () => {
      const league1 = new mongoose.Types.ObjectId();
      const league2 = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [league1, league2] },
      });

      const result = await service.getAdminLeagues(person._id.toString());

      expect(result).toHaveLength(2);
      expect(result).toContain(league1.toString());
      expect(result).toContain(league2.toString());
    });

    it("should return empty array for super_admin", async () => {
      const person = await createPerson({
        roles: ["super_administrator"],
        adminScope: { type: "super" },
      });

      const result = await service.getAdminLeagues(person._id.toString());
      expect(result).toHaveLength(0);
    });

    it("should return empty array for a regular user", async () => {
      const person = await createPerson({ roles: ["racer"] });

      const result = await service.getAdminLeagues(person._id.toString());
      expect(result).toHaveLength(0);
    });

    it("should return empty array for non-existent user", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await service.getAdminLeagues(fakeId);
      expect(result).toHaveLength(0);
    });

    it("should return empty array if leagueIds is undefined", async () => {
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league" },
      });

      const result = await service.getAdminLeagues(person._id.toString());
      expect(result).toHaveLength(0);
    });
  });

  describe("assignLeagueAdmin", () => {
    it("should assign league_administrator role and set adminScope (Req 12.3)", async () => {
      const person = await createPerson({ roles: ["racer"] });
      const league1 = new mongoose.Types.ObjectId().toString();
      const league2 = new mongoose.Types.ObjectId().toString();

      await service.assignLeagueAdmin(person._id.toString(), [league1, league2]);

      const updated = await PersonModel.findById(person._id);
      expect(updated!.roles).toContain("league_administrator");
      expect(updated!.adminScope!.type).toBe("league");
      expect(updated!.adminScope!.leagueIds).toHaveLength(2);
      expect(updated!.adminScope!.leagueIds!.map((id) => id.toString())).toContain(league1);
      expect(updated!.adminScope!.leagueIds!.map((id) => id.toString())).toContain(league2);
    });

    it("should not duplicate role if already a league_administrator", async () => {
      const leagueId = new mongoose.Types.ObjectId().toString();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [new mongoose.Types.ObjectId()] },
      });

      await service.assignLeagueAdmin(person._id.toString(), [leagueId]);

      const updated = await PersonModel.findById(person._id);
      const leagueAdminCount = updated!.roles.filter(
        (r) => r === "league_administrator"
      ).length;
      expect(leagueAdminCount).toBe(1);
    });

    it("should overwrite existing leagueIds when reassigning (Req 12.4)", async () => {
      const oldLeague = new mongoose.Types.ObjectId().toString();
      const newLeague = new mongoose.Types.ObjectId().toString();
      const person = await createPerson({
        roles: ["league_administrator"],
        adminScope: { type: "league", leagueIds: [new mongoose.Types.ObjectId(oldLeague)] },
      });

      await service.assignLeagueAdmin(person._id.toString(), [newLeague]);

      const updated = await PersonModel.findById(person._id);
      expect(updated!.adminScope!.leagueIds).toHaveLength(1);
      expect(updated!.adminScope!.leagueIds![0].toString()).toBe(newLeague);
    });

    it("should throw PERSON_NOT_FOUND for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const leagueId = new mongoose.Types.ObjectId().toString();

      try {
        await service.assignLeagueAdmin(fakeId, [leagueId]);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("PERSON_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });
  });

  describe("removeLeagueAdmin", () => {
    it("should remove league_administrator role and unset adminScope (Req 12.8)", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["racer", "league_administrator"],
        adminScope: { type: "league", leagueIds: [leagueId] },
      });

      await service.removeLeagueAdmin(person._id.toString());

      const updated = await PersonModel.findById(person._id);
      expect(updated!.roles).not.toContain("league_administrator");
      expect(updated!.roles).toContain("racer");
      expect(updated!.adminScope?.type).toBeUndefined();
    });

    it("should not affect other roles when removing league_admin", async () => {
      const leagueId = new mongoose.Types.ObjectId();
      const person = await createPerson({
        roles: ["racer", "volunteer", "league_administrator"],
        adminScope: { type: "league", leagueIds: [leagueId] },
      });

      await service.removeLeagueAdmin(person._id.toString());

      const updated = await PersonModel.findById(person._id);
      expect(updated!.roles).toContain("racer");
      expect(updated!.roles).toContain("volunteer");
      expect(updated!.roles).not.toContain("league_administrator");
    });

    it("should throw PERSON_NOT_FOUND for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      try {
        await service.removeLeagueAdmin(fakeId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("PERSON_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });

    it("should handle removing league_admin from person who does not have the role", async () => {
      const person = await createPerson({ roles: ["racer"] });

      await service.removeLeagueAdmin(person._id.toString());

      const updated = await PersonModel.findById(person._id);
      expect(updated!.roles).toEqual(["racer"]);
      expect(updated!.adminScope?.type).toBeUndefined();
    });
  });
});
