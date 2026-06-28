import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { PersonService } from "@/services/person.service";
import { PersonModel } from "@/models/person.model";
import type { Role } from "@/types";

let mongoServer: MongoMemoryServer;
let service: PersonService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Set env var so connectMongoDB uses the in-memory server
  process.env.MONGODB_URI = uri;
  service = new PersonService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await PersonModel.deleteMany({});
});

describe("PersonService", () => {
  describe("create", () => {
    it("should create a person with name and contact info", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        phone: "555-1234",
      });

      expect(person.name.first).toBe("Jane");
      expect(person.name.last).toBe("Doe");
      expect(person.email).toBe("jane@example.com");
      expect(person.phone).toBe("555-1234");
      expect(person.roles).toEqual([]);
      expect(person.isRegistered).toBe(false);
      expect(person.createdAt).toBeInstanceOf(Date);
      expect(person.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a person with roles", async () => {
      const person = await service.create({
        name: { first: "John", last: "Smith" },
        email: "john@example.com",
        roles: ["racer", "volunteer"],
      });

      expect(person.roles).toContain("racer");
      expect(person.roles).toContain("volunteer");
      expect(person.roles).toHaveLength(2);
    });

    it("should throw error for invalid role", async () => {
      await expect(
        service.create({
          name: { first: "Bad", last: "Role" },
          email: "bad@example.com",
          roles: ["invalid_role" as Role],
        })
      ).rejects.toThrow('Invalid role "invalid_role"');
    });

    it("should create a person with category and license", async () => {
      const person = await service.create({
        name: { first: "Pro", last: "Racer" },
        email: "pro@example.com",
        roles: ["racer"],
        category: "cat2",
        usaCyclingLicense: "12345",
      });

      expect(person.category).toBe("cat2");
      expect(person.usaCyclingLicense).toBe("12345");
    });
  });

  describe("update", () => {
    it("should update person fields", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
      });

      const updated = await service.update(person._id.toString(), {
        name: { first: "Janet", last: "Doe" },
        phone: "555-9999",
      });

      expect(updated!.name.first).toBe("Janet");
      expect(updated!.phone).toBe("555-9999");
    });

    it("should throw error for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.update(fakeId, { phone: "555-0000" })
      ).rejects.toThrow(`Person with id "${fakeId}" not found`);
    });
  });

  describe("assignRoles", () => {
    it("should add roles without duplicates", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer"],
      });

      const updated = await service.assignRoles(person._id.toString(), [
        "volunteer",
        "racer",
      ]);

      expect(updated.roles).toContain("racer");
      expect(updated.roles).toContain("volunteer");
      expect(updated.roles).toHaveLength(2);
    });

    it("should allow multiple roles simultaneously (Req 1.3)", async () => {
      const person = await service.create({
        name: { first: "Multi", last: "Role" },
        email: "multi@example.com",
      });

      const updated = await service.assignRoles(person._id.toString(), [
        "racer",
        "volunteer",
        "mentor",
        "race_official",
        "administrator",
      ]);

      expect(updated.roles).toHaveLength(5);
    });

    it("should throw error for empty roles array", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
      });

      await expect(
        service.assignRoles(person._id.toString(), [])
      ).rejects.toThrow("At least one role must be provided");
    });

    it("should throw error for invalid role", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
      });

      await expect(
        service.assignRoles(person._id.toString(), ["bogus" as Role])
      ).rejects.toThrow('Invalid role "bogus"');
    });

    it("should throw error for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.assignRoles(fakeId, ["racer"])
      ).rejects.toThrow(`Person with id "${fakeId}" not found`);
    });
  });

  describe("removeRole", () => {
    it("should remove a role while preserving others (Req 1.4)", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer", "volunteer", "mentor"],
      });

      const updated = await service.removeRole(
        person._id.toString(),
        "volunteer"
      );

      expect(updated.roles).toContain("racer");
      expect(updated.roles).toContain("mentor");
      expect(updated.roles).not.toContain("volunteer");
      expect(updated.roles).toHaveLength(2);
    });

    it("should preserve historical data when removing a role", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer", "administrator"],
        category: "cat3",
        usaCyclingLicense: "ABC123",
      });

      const updated = await service.removeRole(
        person._id.toString(),
        "administrator"
      );

      // All other data should remain intact
      expect(updated.name.first).toBe("Jane");
      expect(updated.email).toBe("jane@example.com");
      expect(updated.category).toBe("cat3");
      expect(updated.usaCyclingLicense).toBe("ABC123");
      expect(updated.roles).toEqual(["racer"]);
    });

    it("should throw error for invalid role", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer"],
      });

      await expect(
        service.removeRole(person._id.toString(), "invalid" as Role)
      ).rejects.toThrow('Invalid role "invalid"');
    });

    it("should throw error if person does not have the role", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer"],
      });

      await expect(
        service.removeRole(person._id.toString(), "volunteer")
      ).rejects.toThrow('Person does not have role "volunteer"');
    });

    it("should throw error for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.removeRole(fakeId, "racer")
      ).rejects.toThrow(`Person with id "${fakeId}" not found`);
    });
  });

  describe("getById", () => {
    it("should return person by ID", async () => {
      const person = await service.create({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer"],
      });

      const found = await service.getById(person._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name.first).toBe("Jane");
      expect(found!.email).toBe("jane@example.com");
    });

    it("should return null for non-existent person", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await service.create({
        name: { first: "Alice", last: "Racer" },
        email: "alice@example.com",
        roles: ["racer"],
        category: "cat2",
      });
      await service.create({
        name: { first: "Bob", last: "Volunteer" },
        email: "bob@example.com",
        roles: ["volunteer"],
        category: "cat4",
      });
      await service.create({
        name: { first: "Charlie", last: "Admin" },
        email: "charlie@example.com",
        roles: ["administrator", "racer"],
        category: "cat1",
      });
    });

    it("should list all people when no filters provided", async () => {
      const people = await service.list();
      expect(people).toHaveLength(3);
    });

    it("should filter by role", async () => {
      const racers = await service.list({ roles: ["racer"] });
      expect(racers).toHaveLength(2);
      expect(racers.every((p) => p.roles.includes("racer"))).toBe(true);
    });

    it("should filter by category", async () => {
      const cat2 = await service.list({ category: "cat2" });
      expect(cat2).toHaveLength(1);
      expect(cat2[0].name.first).toBe("Alice");
    });

    it("should filter by name (case-insensitive search)", async () => {
      const results = await service.list({ name: "alice" });
      expect(results).toHaveLength(1);
      expect(results[0].name.first).toBe("Alice");
    });

    it("should filter by last name", async () => {
      const results = await service.list({ name: "admin" });
      expect(results).toHaveLength(1);
      expect(results[0].name.last).toBe("Admin");
    });

    it("should filter by organizationId", async () => {
      const orgId = new mongoose.Types.ObjectId().toString();
      await service.create({
        name: { first: "Team", last: "Member" },
        email: "team@example.com",
        roles: ["racer"],
        organizationIds: [orgId],
      });

      const results = await service.list({ organizationId: orgId });
      expect(results).toHaveLength(1);
      expect(results[0].name.first).toBe("Team");
    });

    it("should return sorted results by last name then first name", async () => {
      const people = await service.list();
      const names = people.map((p) => `${p.name.last}, ${p.name.first}`);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });
});
