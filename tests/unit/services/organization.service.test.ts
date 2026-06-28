import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { OrganizationService } from "@/services/organization.service";
import { OrganizationModel } from "@/models/organization.model";
import { PersonModel } from "@/models/person.model";
import { PersonService } from "@/services/person.service";
import type { OrganizationType } from "@/types";

let mongoServer: MongoMemoryServer;
let service: OrganizationService;
let personService: PersonService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new OrganizationService();
  personService = new PersonService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await OrganizationModel.deleteMany({});
  await PersonModel.deleteMany({});
});

describe("OrganizationService", () => {
  describe("create", () => {
    it("should create an organization with unique name and type (Req 2.1)", async () => {
      const org = await service.create({
        name: "Speed Demons",
        type: "team",
        description: "A fast team",
      });

      expect(org.name).toBe("Speed Demons");
      expect(org.type).toBe("team");
      expect(org.description).toBe("A fast team");
      expect(org.memberIds).toEqual([]);
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it("should create organizations of all valid types", async () => {
      const types: OrganizationType[] = ["team", "promoter", "sponsor", "other"];

      for (const type of types) {
        const org = await service.create({
          name: `Org ${type}`,
          type,
        });
        expect(org.type).toBe(type);
      }
    });

    it("should throw friendly error for duplicate name", async () => {
      await service.create({ name: "UniqueTeam", type: "team" });

      await expect(
        service.create({ name: "UniqueTeam", type: "promoter" })
      ).rejects.toThrow(
        'An organization with the name "UniqueTeam" already exists'
      );
    });

    it("should throw error for invalid type", async () => {
      await expect(
        service.create({ name: "Bad Org", type: "invalid" as OrganizationType })
      ).rejects.toThrow('Invalid organization type "invalid"');
    });
  });

  describe("update", () => {
    it("should update organization fields", async () => {
      const org = await service.create({
        name: "Old Name",
        type: "team",
      });

      const updated = await service.update(org._id.toString(), {
        name: "New Name",
        description: "Updated description",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("Updated description");
      expect(updated.type).toBe("team");
    });

    it("should throw error for non-existent organization", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.update(fakeId, { name: "Nope" })
      ).rejects.toThrow(`Organization with id "${fakeId}" not found`);
    });

    it("should throw friendly error for duplicate name on update", async () => {
      await service.create({ name: "Team A", type: "team" });
      const orgB = await service.create({ name: "Team B", type: "team" });

      await expect(
        service.update(orgB._id.toString(), { name: "Team A" })
      ).rejects.toThrow('An organization with the name "Team A" already exists');
    });

    it("should throw error for invalid type on update", async () => {
      const org = await service.create({ name: "Valid", type: "team" });

      await expect(
        service.update(org._id.toString(), {
          type: "bogus" as OrganizationType,
        })
      ).rejects.toThrow('Invalid organization type "bogus"');
    });
  });

  describe("addMember", () => {
    it("should associate a person with an organization (Req 2.2)", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
        roles: ["racer"],
      });

      await service.addMember(org._id.toString(), person._id.toString());

      const updatedOrg = await OrganizationModel.findById(org._id);
      const updatedPerson = await PersonModel.findById(person._id);

      expect(updatedOrg!.memberIds.map((id) => id.toString())).toContain(
        person._id.toString()
      );
      expect(
        updatedPerson!.organizationIds.map((id) => id.toString())
      ).toContain(org._id.toString());
    });

    it("should allow a person to belong to multiple organizations (Req 2.3)", async () => {
      const org1 = await service.create({ name: "Team A", type: "team" });
      const org2 = await service.create({ name: "Sponsor B", type: "sponsor" });
      const person = await personService.create({
        name: { first: "Bob", last: "Multi" },
        email: "bob@example.com",
        roles: ["racer"],
      });

      await service.addMember(org1._id.toString(), person._id.toString());
      await service.addMember(org2._id.toString(), person._id.toString());

      const updatedPerson = await PersonModel.findById(person._id);
      expect(updatedPerson!.organizationIds).toHaveLength(2);
      expect(
        updatedPerson!.organizationIds.map((id) => id.toString())
      ).toContain(org1._id.toString());
      expect(
        updatedPerson!.organizationIds.map((id) => id.toString())
      ).toContain(org2._id.toString());
    });

    it("should not create duplicate membership entries", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
        roles: ["racer"],
      });

      await service.addMember(org._id.toString(), person._id.toString());
      await service.addMember(org._id.toString(), person._id.toString());

      const updatedOrg = await OrganizationModel.findById(org._id);
      const updatedPerson = await PersonModel.findById(person._id);

      expect(updatedOrg!.memberIds).toHaveLength(1);
      expect(updatedPerson!.organizationIds).toHaveLength(1);
    });

    it("should throw error for non-existent organization", async () => {
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
      });
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.addMember(fakeId, person._id.toString())
      ).rejects.toThrow(`Organization with id "${fakeId}" not found`);
    });

    it("should throw error for non-existent person", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.addMember(org._id.toString(), fakeId)
      ).rejects.toThrow(`Person with id "${fakeId}" not found`);
    });
  });

  describe("removeMember", () => {
    it("should disassociate a person from an organization (Req 2.5)", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
        roles: ["racer"],
        category: "cat3",
        usaCyclingLicense: "LIC123",
      });

      await service.addMember(org._id.toString(), person._id.toString());
      await service.removeMember(org._id.toString(), person._id.toString());

      const updatedOrg = await OrganizationModel.findById(org._id);
      const updatedPerson = await PersonModel.findById(person._id);

      expect(updatedOrg!.memberIds).toHaveLength(0);
      expect(updatedPerson!.organizationIds).toHaveLength(0);
    });

    it("should preserve person's individual records after removal (Req 2.5)", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
        roles: ["racer", "volunteer"],
        category: "cat2",
        usaCyclingLicense: "USA999",
      });

      await service.addMember(org._id.toString(), person._id.toString());
      await service.removeMember(org._id.toString(), person._id.toString());

      const updatedPerson = await PersonModel.findById(person._id);

      // All personal data should remain intact
      expect(updatedPerson!.name.first).toBe("Alice");
      expect(updatedPerson!.name.last).toBe("Rider");
      expect(updatedPerson!.email).toBe("alice@example.com");
      expect(updatedPerson!.roles).toContain("racer");
      expect(updatedPerson!.roles).toContain("volunteer");
      expect(updatedPerson!.category).toBe("cat2");
      expect(updatedPerson!.usaCyclingLicense).toBe("USA999");
    });

    it("should preserve other organization memberships (Req 2.5)", async () => {
      const org1 = await service.create({ name: "Team A", type: "team" });
      const org2 = await service.create({ name: "Sponsor B", type: "sponsor" });
      const person = await personService.create({
        name: { first: "Bob", last: "Multi" },
        email: "bob@example.com",
        roles: ["racer"],
      });

      await service.addMember(org1._id.toString(), person._id.toString());
      await service.addMember(org2._id.toString(), person._id.toString());

      // Remove from org1 only
      await service.removeMember(org1._id.toString(), person._id.toString());

      const updatedPerson = await PersonModel.findById(person._id);
      expect(updatedPerson!.organizationIds).toHaveLength(1);
      expect(
        updatedPerson!.organizationIds.map((id) => id.toString())
      ).toContain(org2._id.toString());
    });

    it("should throw error for non-existent organization", async () => {
      const person = await personService.create({
        name: { first: "Alice", last: "Rider" },
        email: "alice@example.com",
      });
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.removeMember(fakeId, person._id.toString())
      ).rejects.toThrow(`Organization with id "${fakeId}" not found`);
    });

    it("should throw error for non-existent person", async () => {
      const org = await service.create({ name: "Team X", type: "team" });
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.removeMember(org._id.toString(), fakeId)
      ).rejects.toThrow(`Person with id "${fakeId}" not found`);
    });
  });

  describe("getTeams", () => {
    it("should return only team-type organizations (Req 2.6)", async () => {
      await service.create({ name: "Team A", type: "team" });
      await service.create({ name: "Team B", type: "team" });
      await service.create({ name: "Promoter C", type: "promoter" });
      await service.create({ name: "Sponsor D", type: "sponsor" });

      const teams = await service.getTeams();

      expect(teams).toHaveLength(2);
      expect(teams.every((t) => t.type === "team")).toBe(true);
    });

    it("should return teams sorted by name", async () => {
      await service.create({ name: "Zephyr Racing", type: "team" });
      await service.create({ name: "Alpha Wheels", type: "team" });

      const teams = await service.getTeams();

      expect(teams[0].name).toBe("Alpha Wheels");
      expect(teams[1].name).toBe("Zephyr Racing");
    });

    it("should return empty array if no teams exist", async () => {
      await service.create({ name: "Promoter Only", type: "promoter" });

      const teams = await service.getTeams();
      expect(teams).toHaveLength(0);
    });
  });

  describe("racer without team (Req 2.4)", () => {
    it("should allow a racer to exist without any team organization", async () => {
      const person = await personService.create({
        name: { first: "Solo", last: "Racer" },
        email: "solo@example.com",
        roles: ["racer"],
        category: "cat4",
      });

      // Person exists with no organizationIds
      expect(person.organizationIds).toHaveLength(0);
      expect(person.roles).toContain("racer");

      // Verify the person is still accessible and valid
      const fetched = await PersonModel.findById(person._id);
      expect(fetched).not.toBeNull();
      expect(fetched!.roles).toContain("racer");
      expect(fetched!.organizationIds).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return organization by ID", async () => {
      const org = await service.create({
        name: "Find Me",
        type: "sponsor",
        description: "A sponsor",
      });

      const found = await service.getById(org._id.toString());
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Find Me");
      expect(found!.type).toBe("sponsor");
    });

    it("should return null for non-existent organization", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await service.create({ name: "Team A", type: "team" });
      await service.create({ name: "Team B", type: "team" });
      await service.create({ name: "Promoter C", type: "promoter" });
      await service.create({ name: "Sponsor D", type: "sponsor" });
    });

    it("should list all organizations when no filter provided", async () => {
      const orgs = await service.list();
      expect(orgs).toHaveLength(4);
    });

    it("should filter by type", async () => {
      const teams = await service.list("team");
      expect(teams).toHaveLength(2);
      expect(teams.every((o) => o.type === "team")).toBe(true);
    });

    it("should return sorted results by name", async () => {
      const orgs = await service.list();
      const names = orgs.map((o) => o.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });
});
