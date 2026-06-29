import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { AwardService } from "@/services/award.service";
import {
  AwardModel,
  AssignedAwardModel,
  PeerNominationModel,
} from "@/models/award.model";
import { SeasonModel } from "@/models/season.model";
import { PersonModel } from "@/models/person.model";
import { SeasonService } from "@/services/season.service";

let mongoServer: MongoMemoryServer;
let service: AwardService;
let seasonService: SeasonService;
const defaultLeagueId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new AwardService();
  seasonService = new SeasonService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await AwardModel.deleteMany({});
  await AssignedAwardModel.deleteMany({});
  await PeerNominationModel.deleteMany({});
  await SeasonModel.deleteMany({});
  await PersonModel.deleteMany({});
});

/** Helper to create an active season */
async function createActiveSeason() {
  const season = await seasonService.create({
    name: "2024 Season",
    leagueId: defaultLeagueId,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });
  await seasonService.activate(season._id.toString());
  return SeasonModel.findById(season._id);
}

/** Helper to create a person */
async function createPerson(overrides?: Partial<{ first: string; last: string; email: string }>) {
  return PersonModel.create({
    name: { first: overrides?.first ?? "Test", last: overrides?.last ?? "Person" },
    email: overrides?.email ?? `person-${Date.now()}-${Math.random()}@example.com`,
    roles: ["racer"],
    category: "cat3",
    isRegistered: true,
  });
}

describe("AwardService", () => {
  describe("define", () => {
    it("should create an award with nomination type and badge (Req 8.1)", async () => {
      const award = await service.define({
        name: "Sportsmanship Award",
        description: "For exemplary sportsmanship",
        badgeUrl: "https://example.com/badge-sportsmanship.png",
        nominationType: "admin_assigned",
      });

      expect(award).toBeDefined();
      expect(award.name).toBe("Sportsmanship Award");
      expect(award.description).toBe("For exemplary sportsmanship");
      expect(award.badgeUrl).toBe("https://example.com/badge-sportsmanship.png");
      expect(award.nominationType).toBe("admin_assigned");
      expect(award.createdAt).toBeInstanceOf(Date);
    });

    it("should create a peer-nominated award", async () => {
      const award = await service.define({
        name: "Most Helpful Racer",
        description: "Nominated by peers for being helpful",
        badgeUrl: "https://example.com/badge-helpful.png",
        nominationType: "peer_nominated",
      });

      expect(award.nominationType).toBe("peer_nominated");
    });
  });

  describe("assign", () => {
    it("should admin-assign an award to a person for a season (Req 8.2, 8.9, 8.10)", async () => {
      const season = await createActiveSeason();
      const person = await createPerson();
      const award = await service.define({
        name: "MVP",
        description: "Most Valuable Player",
        badgeUrl: "https://example.com/badge-mvp.png",
        nominationType: "admin_assigned",
      });

      const assigned = await service.assign(
        award._id.toString(),
        person._id.toString(),
        season!._id.toString(),
        defaultLeagueId
      );

      expect(assigned).toBeDefined();
      expect(assigned.awardId.toString()).toBe(award._id.toString());
      expect(assigned.recipientId.toString()).toBe(person._id.toString());
      expect(assigned.seasonId.toString()).toBe(season!._id.toString());
      expect(assigned.leagueId.toString()).toBe(defaultLeagueId);
      expect(assigned.source).toBe("admin_assigned");
      expect(assigned.assignedAt).toBeInstanceOf(Date);
      expect(assigned.nominationId).toBeUndefined();
    });

    it("should allow assigning an award to any person regardless of role (Req 8.3)", async () => {
      const season = await createActiveSeason();
      // Create a volunteer (non-racer) person
      const volunteer = await PersonModel.create({
        name: { first: "Vol", last: "Unteer" },
        email: `volunteer-${Date.now()}@example.com`,
        roles: ["volunteer"],
        isRegistered: true,
      });
      const award = await service.define({
        name: "Best Volunteer",
        description: "Outstanding volunteer contributions",
        badgeUrl: "https://example.com/badge-vol.png",
        nominationType: "admin_assigned",
      });

      const assigned = await service.assign(
        award._id.toString(),
        volunteer._id.toString(),
        season!._id.toString(),
        defaultLeagueId
      );

      expect(assigned.recipientId.toString()).toBe(volunteer._id.toString());
    });
  });

  describe("submitNomination", () => {
    it("should submit a peer nomination (Req 8.6)", async () => {
      const season = await createActiveSeason();
      const nominator = await createPerson({ first: "Alice", email: `alice-${Date.now()}@example.com` });
      const nominee = await createPerson({ first: "Bob", email: `bob-${Date.now()}@example.com` });
      const award = await service.define({
        name: "Most Improved",
        description: "Most improved racer",
        badgeUrl: "https://example.com/badge-improved.png",
        nominationType: "peer_nominated",
      });

      const nomination = await service.submitNomination({
        nominatorId: nominator._id.toString(),
        nomineeId: nominee._id.toString(),
        awardId: award._id.toString(),
        seasonId: season!._id.toString(),
        reason: "Bob has improved a lot this season",
      });

      expect(nomination).toBeDefined();
      expect(nomination.nominatorId.toString()).toBe(nominator._id.toString());
      expect(nomination.nomineeId.toString()).toBe(nominee._id.toString());
      expect(nomination.awardId.toString()).toBe(award._id.toString());
      expect(nomination.seasonId.toString()).toBe(season!._id.toString());
      expect(nomination.reason).toBe("Bob has improved a lot this season");
      expect(nomination.status).toBe("pending");
      expect(nomination.createdAt).toBeInstanceOf(Date);
    });

    it("should reject self-nomination (Req 8.7)", async () => {
      const season = await createActiveSeason();
      const person = await createPerson();
      const award = await service.define({
        name: "Most Improved",
        description: "Most improved racer",
        badgeUrl: "https://example.com/badge-improved.png",
        nominationType: "peer_nominated",
      });

      await expect(
        service.submitNomination({
          nominatorId: person._id.toString(),
          nomineeId: person._id.toString(),
          awardId: award._id.toString(),
          seasonId: season!._id.toString(),
        })
      ).rejects.toThrow("A person cannot nominate themselves");
    });

    it("should allow nomination without a reason", async () => {
      const season = await createActiveSeason();
      const nominator = await createPerson({ first: "Charlie", email: `charlie-${Date.now()}@example.com` });
      const nominee = await createPerson({ first: "Diana", email: `diana-${Date.now()}@example.com` });
      const award = await service.define({
        name: "Team Spirit",
        description: "Great team spirit",
        badgeUrl: "https://example.com/badge-spirit.png",
        nominationType: "peer_nominated",
      });

      const nomination = await service.submitNomination({
        nominatorId: nominator._id.toString(),
        nomineeId: nominee._id.toString(),
        awardId: award._id.toString(),
        seasonId: season!._id.toString(),
      });

      expect(nomination.reason).toBeUndefined();
    });
  });

  describe("approveNomination", () => {
    it("should approve a nomination and assign the award (Req 8.8, 8.9)", async () => {
      const season = await createActiveSeason();
      const nominator = await createPerson({ first: "Eve", email: `eve-${Date.now()}@example.com` });
      const nominee = await createPerson({ first: "Frank", email: `frank-${Date.now()}@example.com` });
      const reviewer = await createPerson({ first: "Admin", email: `admin-${Date.now()}@example.com` });
      const award = await service.define({
        name: "Most Helpful",
        description: "Most helpful racer",
        badgeUrl: "https://example.com/badge-helpful.png",
        nominationType: "peer_nominated",
      });

      const nomination = await service.submitNomination({
        nominatorId: nominator._id.toString(),
        nomineeId: nominee._id.toString(),
        awardId: award._id.toString(),
        seasonId: season!._id.toString(),
        reason: "Always helps others",
      });

      const assigned = await service.approveNomination(
        nomination._id.toString(),
        defaultLeagueId,
        reviewer._id.toString()
      );

      expect(assigned).toBeDefined();
      expect(assigned.awardId.toString()).toBe(award._id.toString());
      expect(assigned.recipientId.toString()).toBe(nominee._id.toString());
      expect(assigned.leagueId.toString()).toBe(defaultLeagueId);
      expect(assigned.source).toBe("peer_nominated");
      expect(assigned.nominationId!.toString()).toBe(nomination._id.toString());

      // Verify nomination was updated
      const updatedNomination = await PeerNominationModel.findById(nomination._id);
      expect(updatedNomination!.status).toBe("approved");
      expect(updatedNomination!.reviewedAt).toBeInstanceOf(Date);
      expect(updatedNomination!.reviewedBy!.toString()).toBe(reviewer._id.toString());
    });

    it("should use the active season for assignment (Req 8.10)", async () => {
      const season = await createActiveSeason();
      const nominator = await createPerson({ first: "Grace", email: `grace-${Date.now()}@example.com` });
      const nominee = await createPerson({ first: "Hank", email: `hank-${Date.now()}@example.com` });
      const award = await service.define({
        name: "Best Newcomer",
        description: "Best new racer",
        badgeUrl: "https://example.com/badge-newcomer.png",
        nominationType: "peer_nominated",
      });

      const nomination = await service.submitNomination({
        nominatorId: nominator._id.toString(),
        nomineeId: nominee._id.toString(),
        awardId: award._id.toString(),
        seasonId: season!._id.toString(),
      });

      const assigned = await service.approveNomination(nomination._id.toString(), defaultLeagueId);

      // Should use the active season
      expect(assigned.seasonId.toString()).toBe(season!._id.toString());
    });

    it("should throw if nomination not found", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(service.approveNomination(fakeId, defaultLeagueId)).rejects.toThrow(
        `Nomination with id "${fakeId}" not found`
      );
    });

    it("should throw if nomination is already approved", async () => {
      const season = await createActiveSeason();
      const nominator = await createPerson({ first: "Ivy", email: `ivy-${Date.now()}@example.com` });
      const nominee = await createPerson({ first: "Jack", email: `jack-${Date.now()}@example.com` });
      const award = await service.define({
        name: "Leadership",
        description: "Outstanding leadership",
        badgeUrl: "https://example.com/badge-leader.png",
        nominationType: "peer_nominated",
      });

      const nomination = await service.submitNomination({
        nominatorId: nominator._id.toString(),
        nomineeId: nominee._id.toString(),
        awardId: award._id.toString(),
        seasonId: season!._id.toString(),
      });

      // Approve once
      await service.approveNomination(nomination._id.toString(), defaultLeagueId);

      // Approve again should throw
      await expect(
        service.approveNomination(nomination._id.toString(), defaultLeagueId)
      ).rejects.toThrow("Nomination is already approved and cannot be approved");
    });
  });
});
