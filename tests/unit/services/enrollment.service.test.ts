import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { EnrollmentService } from "@/services/enrollment.service";
import { EnrollmentModel } from "@/models/enrollment.model";

let mongoServer: MongoMemoryServer;
let service: EnrollmentService;

// Helper to generate ObjectId strings
const objectId = () => new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new EnrollmentService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await EnrollmentModel.deleteMany({});
});

describe("EnrollmentService", () => {
  describe("enrollPerson", () => {
    it("should create a person enrollment (Req 3.1)", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      const enrollment = await service.enrollPerson(personId, leagueId, seasonId, adminId);

      expect(enrollment.entityType).toBe("person");
      expect(enrollment.entityId.toString()).toBe(personId);
      expect(enrollment.leagueId.toString()).toBe(leagueId);
      expect(enrollment.seasonId.toString()).toBe(seasonId);
      expect(enrollment.enrolledBy.toString()).toBe(adminId);
      expect(enrollment.isActive).toBe(true);
      expect(enrollment.enrolledAt).toBeInstanceOf(Date);
      expect(enrollment.createdAt).toBeInstanceOf(Date);
      expect(enrollment.updatedAt).toBeInstanceOf(Date);
    });

    it("should prevent duplicate enrollment for same person in same league-season (Req 3.5)", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId, adminId);

      try {
        await service.enrollPerson(personId, leagueId, seasonId, adminId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("ENROLLMENT_DUPLICATE");
        expect((error as Error & { statusCode: number }).statusCode).toBe(409);
      }
    });

    it("should allow same person in different league-seasons (Req 3.2, 3.3)", async () => {
      const personId = objectId();
      const leagueId1 = objectId();
      const leagueId2 = objectId();
      const seasonId1 = objectId();
      const seasonId2 = objectId();
      const adminId = objectId();

      const e1 = await service.enrollPerson(personId, leagueId1, seasonId1, adminId);
      const e2 = await service.enrollPerson(personId, leagueId2, seasonId2, adminId);
      const e3 = await service.enrollPerson(personId, leagueId1, seasonId2, adminId);

      expect(e1.entityId.toString()).toBe(personId);
      expect(e2.entityId.toString()).toBe(personId);
      expect(e3.entityId.toString()).toBe(personId);
    });
  });

  describe("enrollOrganization", () => {
    it("should create an organization enrollment (Req 4.1)", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      const enrollment = await service.enrollOrganization(orgId, leagueId, seasonId, adminId);

      expect(enrollment.entityType).toBe("organization");
      expect(enrollment.entityId.toString()).toBe(orgId);
      expect(enrollment.leagueId.toString()).toBe(leagueId);
      expect(enrollment.seasonId.toString()).toBe(seasonId);
      expect(enrollment.enrolledBy.toString()).toBe(adminId);
      expect(enrollment.isActive).toBe(true);
    });

    it("should prevent duplicate enrollment for same org in same league-season (Req 4.5)", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(orgId, leagueId, seasonId, adminId);

      try {
        await service.enrollOrganization(orgId, leagueId, seasonId, adminId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("ENROLLMENT_DUPLICATE");
        expect((error as Error & { statusCode: number }).statusCode).toBe(409);
      }
    });

    it("should allow same org in different league-seasons (Req 4.2, 4.3)", async () => {
      const orgId = objectId();
      const leagueId1 = objectId();
      const leagueId2 = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      const e1 = await service.enrollOrganization(orgId, leagueId1, seasonId, adminId);
      const e2 = await service.enrollOrganization(orgId, leagueId2, seasonId, adminId);

      expect(e1.entityId.toString()).toBe(orgId);
      expect(e2.entityId.toString()).toBe(orgId);
    });
  });

  describe("removePerson", () => {
    it("should remove a person enrollment (Req 3.4)", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId, adminId);

      await service.removePerson(personId, leagueId, seasonId);

      // Verify enrollment is gone
      const enrollments = await service.getPersonEnrollments(personId);
      expect(enrollments).toHaveLength(0);
    });

    it("should throw ENROLLMENT_NOT_FOUND if enrollment does not exist", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();

      try {
        await service.removePerson(personId, leagueId, seasonId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("ENROLLMENT_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });

    it("should not affect other enrollments when removing one", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId1 = objectId();
      const seasonId2 = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId1, adminId);
      await service.enrollPerson(personId, leagueId, seasonId2, adminId);

      await service.removePerson(personId, leagueId, seasonId1);

      const enrollments = await service.getPersonEnrollments(personId);
      expect(enrollments).toHaveLength(1);
      expect(enrollments[0].seasonId.toString()).toBe(seasonId2);
    });
  });

  describe("removeOrganization", () => {
    it("should remove an organization enrollment (Req 4.4)", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(orgId, leagueId, seasonId, adminId);

      await service.removeOrganization(orgId, leagueId, seasonId);

      const enrollments = await service.getOrganizationEnrollments(orgId);
      expect(enrollments).toHaveLength(0);
    });

    it("should throw ENROLLMENT_NOT_FOUND if enrollment does not exist", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();

      try {
        await service.removeOrganization(orgId, leagueId, seasonId);
        fail("Expected error to be thrown");
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("ENROLLMENT_NOT_FOUND");
        expect((error as Error & { statusCode: number }).statusCode).toBe(404);
      }
    });
  });

  describe("getPersonEnrollments", () => {
    it("should return all enrollments for a person across leagues", async () => {
      const personId = objectId();
      const league1 = objectId();
      const league2 = objectId();
      const season1 = objectId();
      const season2 = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, league1, season1, adminId);
      await service.enrollPerson(personId, league2, season1, adminId);
      await service.enrollPerson(personId, league1, season2, adminId);

      const enrollments = await service.getPersonEnrollments(personId);

      expect(enrollments).toHaveLength(3);
      enrollments.forEach((e) => {
        expect(e.entityType).toBe("person");
        expect(e.entityId.toString()).toBe(personId);
      });
    });

    it("should return empty array if person has no enrollments", async () => {
      const personId = objectId();

      const enrollments = await service.getPersonEnrollments(personId);
      expect(enrollments).toHaveLength(0);
    });

    it("should not return organization enrollments", async () => {
      const id = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(id, leagueId, seasonId, adminId);

      const enrollments = await service.getPersonEnrollments(id);
      expect(enrollments).toHaveLength(0);
    });
  });

  describe("getOrganizationEnrollments", () => {
    it("should return all enrollments for an organization across leagues", async () => {
      const orgId = objectId();
      const league1 = objectId();
      const league2 = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(orgId, league1, seasonId, adminId);
      await service.enrollOrganization(orgId, league2, seasonId, adminId);

      const enrollments = await service.getOrganizationEnrollments(orgId);

      expect(enrollments).toHaveLength(2);
      enrollments.forEach((e) => {
        expect(e.entityType).toBe("organization");
        expect(e.entityId.toString()).toBe(orgId);
      });
    });

    it("should return empty array if org has no enrollments", async () => {
      const orgId = objectId();

      const enrollments = await service.getOrganizationEnrollments(orgId);
      expect(enrollments).toHaveLength(0);
    });
  });

  describe("listByLeagueSeason", () => {
    it("should return all enrollments for a league-season (Req 3.7, 4.7)", async () => {
      const leagueId = objectId();
      const seasonId = objectId();
      const person1 = objectId();
      const person2 = objectId();
      const org1 = objectId();
      const adminId = objectId();

      await service.enrollPerson(person1, leagueId, seasonId, adminId);
      await service.enrollPerson(person2, leagueId, seasonId, adminId);
      await service.enrollOrganization(org1, leagueId, seasonId, adminId);

      const enrollments = await service.listByLeagueSeason(leagueId, seasonId);

      expect(enrollments).toHaveLength(3);
    });

    it("should filter by entity type when provided", async () => {
      const leagueId = objectId();
      const seasonId = objectId();
      const person1 = objectId();
      const org1 = objectId();
      const adminId = objectId();

      await service.enrollPerson(person1, leagueId, seasonId, adminId);
      await service.enrollOrganization(org1, leagueId, seasonId, adminId);

      const persons = await service.listByLeagueSeason(leagueId, seasonId, "person");
      expect(persons).toHaveLength(1);
      expect(persons[0].entityType).toBe("person");

      const orgs = await service.listByLeagueSeason(leagueId, seasonId, "organization");
      expect(orgs).toHaveLength(1);
      expect(orgs[0].entityType).toBe("organization");
    });

    it("should not return enrollments from other league-seasons", async () => {
      const leagueId = objectId();
      const otherLeague = objectId();
      const seasonId = objectId();
      const personId = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId, adminId);
      await service.enrollPerson(personId, otherLeague, seasonId, adminId);

      const enrollments = await service.listByLeagueSeason(leagueId, seasonId);

      expect(enrollments).toHaveLength(1);
      expect(enrollments[0].leagueId.toString()).toBe(leagueId);
    });

    it("should return empty array if no enrollments exist for league-season", async () => {
      const leagueId = objectId();
      const seasonId = objectId();

      const enrollments = await service.listByLeagueSeason(leagueId, seasonId);
      expect(enrollments).toHaveLength(0);
    });
  });

  describe("isPersonEnrolled", () => {
    it("should return true if person is enrolled (Req 3.6)", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId, adminId);

      const enrolled = await service.isPersonEnrolled(personId, leagueId, seasonId);
      expect(enrolled).toBe(true);
    });

    it("should return false if person is not enrolled", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();

      const enrolled = await service.isPersonEnrolled(personId, leagueId, seasonId);
      expect(enrolled).toBe(false);
    });

    it("should return false after enrollment is removed", async () => {
      const personId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollPerson(personId, leagueId, seasonId, adminId);
      await service.removePerson(personId, leagueId, seasonId);

      const enrolled = await service.isPersonEnrolled(personId, leagueId, seasonId);
      expect(enrolled).toBe(false);
    });
  });

  describe("isOrgEnrolled", () => {
    it("should return true if org is enrolled (Req 4.6)", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(orgId, leagueId, seasonId, adminId);

      const enrolled = await service.isOrgEnrolled(orgId, leagueId, seasonId);
      expect(enrolled).toBe(true);
    });

    it("should return false if org is not enrolled", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();

      const enrolled = await service.isOrgEnrolled(orgId, leagueId, seasonId);
      expect(enrolled).toBe(false);
    });

    it("should return false after enrollment is removed", async () => {
      const orgId = objectId();
      const leagueId = objectId();
      const seasonId = objectId();
      const adminId = objectId();

      await service.enrollOrganization(orgId, leagueId, seasonId, adminId);
      await service.removeOrganization(orgId, leagueId, seasonId);

      const enrolled = await service.isOrgEnrolled(orgId, leagueId, seasonId);
      expect(enrolled).toBe(false);
    });
  });
});
