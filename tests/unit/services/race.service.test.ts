import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { RaceService } from "@/services/race.service";
import { RaceModel } from "@/models/race.model";
import { SeasonModel } from "@/models/season.model";
import { PersonModel } from "@/models/person.model";
import { SeasonService } from "@/services/season.service";

let mongoServer: MongoMemoryServer;
let service: RaceService;
let seasonService: SeasonService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new RaceService();
  seasonService = new SeasonService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await RaceModel.deleteMany({});
  await SeasonModel.deleteMany({});
  await PersonModel.deleteMany({});
});

/** Helper to create a season covering 2024 */
async function createSeason2024() {
  return seasonService.create({
    name: "2024 Season",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });
}

/** Helper to create a person */
async function createPerson(overrides?: Record<string, unknown>) {
  return PersonModel.create({
    name: { first: "Test", last: "Person" },
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    roles: ["volunteer"],
    isRegistered: true,
    ...overrides,
  });
}

describe("RaceService", () => {
  describe("create", () => {
    it("should create a race with explicit seasonId (Req 4.1)", async () => {
      const season = await createSeason2024();

      const race = await service.create({
        name: "Downtown Crit",
        date: new Date("2024-06-15"),
        location: { name: "City Center", address: "123 Main St" },
        raceType: "crit",
        categories: ["cat3", "cat4"],
        seasonId: season._id.toString(),
      });

      expect(race.name).toBe("Downtown Crit");
      expect(race.date).toEqual(new Date("2024-06-15"));
      expect(race.location.name).toBe("City Center");
      expect(race.location.address).toBe("123 Main St");
      expect(race.raceType).toBe("crit");
      expect(race.categories).toEqual(["cat3", "cat4"]);
      expect(race.seasonId.toString()).toBe(season._id.toString());
      expect(race.status).toBe("scheduled");
      expect(race.officialIds).toEqual([]);
      expect(race.volunteerIds).toEqual([]);
      expect(race.createdAt).toBeInstanceOf(Date);
      expect(race.updatedAt).toBeInstanceOf(Date);
    });

    it("should auto-associate race with season by date range (Req 4.6)", async () => {
      const season = await createSeason2024();

      const race = await service.create({
        name: "Summer Road Race",
        date: new Date("2024-07-20"),
        location: { name: "Mountain Pass" },
        raceType: "road_race",
      });

      expect(race.seasonId.toString()).toBe(season._id.toString());
    });

    it("should throw if no season covers the race date and no seasonId provided", async () => {
      await expect(
        service.create({
          name: "Orphan Race",
          date: new Date("2030-01-01"),
          location: { name: "Nowhere" },
          raceType: "crit",
        })
      ).rejects.toThrow("No season found containing the race date");
    });

    it("should reject invalid raceType (Req 4.4)", async () => {
      const season = await createSeason2024();

      await expect(
        service.create({
          name: "Bad Race",
          date: new Date("2024-05-01"),
          location: { name: "Somewhere" },
          raceType: "invalid_type" as any,
          seasonId: season._id.toString(),
        })
      ).rejects.toThrow('Invalid race type "invalid_type"');
    });

    it("should allow all valid race types (Req 4.4)", async () => {
      const season = await createSeason2024();
      const validTypes = [
        "crit",
        "time_trial",
        "road_race",
        "cyclocross",
        "gravel",
        "track",
      ] as const;

      for (const raceType of validTypes) {
        const race = await service.create({
          name: `Race ${raceType}`,
          date: new Date("2024-05-01"),
          location: { name: "Track" },
          raceType,
          seasonId: season._id.toString(),
        });
        expect(race.raceType).toBe(raceType);
      }
    });

    it("should support multiple categories for a race (Req 4.5)", async () => {
      const season = await createSeason2024();

      const race = await service.create({
        name: "Multi-Cat Race",
        date: new Date("2024-08-01"),
        location: { name: "Velodrome" },
        raceType: "track",
        categories: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
        seasonId: season._id.toString(),
      });

      expect(race.categories).toHaveLength(6);
    });

    it("should store location with coordinates", async () => {
      const season = await createSeason2024();

      const race = await service.create({
        name: "GPS Race",
        date: new Date("2024-04-01"),
        location: {
          name: "Park",
          address: "456 Park Ave",
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
        raceType: "gravel",
        seasonId: season._id.toString(),
      });

      expect(race.location.coordinates?.lat).toBe(40.7128);
      expect(race.location.coordinates?.lng).toBe(-74.006);
    });
  });

  describe("update", () => {
    it("should update race fields by ID", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Original Race",
        date: new Date("2024-06-01"),
        location: { name: "Old Venue" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const updated = await service.update(race._id.toString(), {
        name: "Updated Race",
        location: { name: "New Venue", address: "789 New St" },
        status: "cancelled",
      });

      expect(updated.name).toBe("Updated Race");
      expect(updated.location.name).toBe("New Venue");
      expect(updated.location.address).toBe("789 New St");
      expect(updated.status).toBe("cancelled");
    });

    it("should throw for non-existent race", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        service.update(fakeId, { name: "Nope" })
      ).rejects.toThrow(`Race with id "${fakeId}" not found`);
    });

    it("should reject invalid raceType on update", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Race",
        date: new Date("2024-06-01"),
        location: { name: "Venue" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      await expect(
        service.update(race._id.toString(), {
          raceType: "bad_type" as any,
        })
      ).rejects.toThrow('Invalid race type "bad_type"');
    });
  });

  describe("assignOfficials", () => {
    it("should assign officials to a race (Req 4.2)", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Officiated Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const person1 = await createPerson({
        name: { first: "Official", last: "One" },
        roles: ["race_official"],
      });
      const person2 = await createPerson({
        name: { first: "Official", last: "Two" },
        roles: ["race_official"],
      });

      const updated = await service.assignOfficials(race._id.toString(), [
        person1._id.toString(),
        person2._id.toString(),
      ]);

      expect(updated.officialIds).toHaveLength(2);
      expect(updated.officialIds.map((id) => id.toString())).toContain(
        person1._id.toString()
      );
      expect(updated.officialIds.map((id) => id.toString())).toContain(
        person2._id.toString()
      );
    });

    it("should replace existing officials with $set", async () => {
      const season = await createSeason2024();
      const person1 = await createPerson({
        name: { first: "Old", last: "Official" },
      });
      const person2 = await createPerson({
        name: { first: "New", last: "Official" },
      });

      const race = await service.create({
        name: "Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
        officialIds: [person1._id.toString()],
      });

      const updated = await service.assignOfficials(race._id.toString(), [
        person2._id.toString(),
      ]);

      expect(updated.officialIds).toHaveLength(1);
      expect(updated.officialIds[0].toString()).toBe(person2._id.toString());
    });

    it("should throw if any person does not exist", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.assignOfficials(race._id.toString(), [fakeId])
      ).rejects.toThrow("One or more persons not found");
    });

    it("should throw for non-existent race", async () => {
      const person = await createPerson();
      const fakeRaceId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.assignOfficials(fakeRaceId, [person._id.toString()])
      ).rejects.toThrow(`Race with id "${fakeRaceId}" not found`);
    });
  });

  describe("assignVolunteers", () => {
    it("should assign volunteers to a race (Req 4.3)", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Volunteered Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const person1 = await createPerson({
        name: { first: "Vol", last: "One" },
        roles: ["volunteer"],
      });
      const person2 = await createPerson({
        name: { first: "Vol", last: "Two" },
        roles: ["volunteer"],
      });

      const updated = await service.assignVolunteers(race._id.toString(), [
        person1._id.toString(),
        person2._id.toString(),
      ]);

      expect(updated.volunteerIds).toHaveLength(2);
    });

    it("should replace existing volunteers with $set", async () => {
      const season = await createSeason2024();
      const person1 = await createPerson({
        name: { first: "Old", last: "Vol" },
      });
      const person2 = await createPerson({
        name: { first: "New", last: "Vol" },
      });

      const race = await service.create({
        name: "Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
        volunteerIds: [person1._id.toString()],
      });

      const updated = await service.assignVolunteers(race._id.toString(), [
        person2._id.toString(),
      ]);

      expect(updated.volunteerIds).toHaveLength(1);
      expect(updated.volunteerIds[0].toString()).toBe(person2._id.toString());
    });

    it("should throw if any person does not exist", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Race",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.assignVolunteers(race._id.toString(), [fakeId])
      ).rejects.toThrow("One or more persons not found");
    });

    it("should throw for non-existent race", async () => {
      const person = await createPerson();
      const fakeRaceId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.assignVolunteers(fakeRaceId, [person._id.toString()])
      ).rejects.toThrow(`Race with id "${fakeRaceId}" not found`);
    });
  });

  describe("getUpcoming", () => {
    it("should return scheduled races with date >= today sorted by date asc", async () => {
      const season = await seasonService.create({
        name: "Future Season",
        startDate: new Date("2030-01-01"),
        endDate: new Date("2030-12-31"),
      });

      // Future races
      await service.create({
        name: "Race B",
        date: new Date("2030-07-15"),
        location: { name: "Track B" },
        raceType: "road_race",
        seasonId: season._id.toString(),
      });
      await service.create({
        name: "Race A",
        date: new Date("2030-03-01"),
        location: { name: "Track A" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });
      // Completed race (should not appear)
      await service.create({
        name: "Done Race",
        date: new Date("2030-09-01"),
        location: { name: "Done" },
        raceType: "track",
        seasonId: season._id.toString(),
        status: "completed",
      });

      const upcoming = await service.getUpcoming();

      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].name).toBe("Race A");
      expect(upcoming[1].name).toBe("Race B");
    });

    it("should not return past races", async () => {
      const season = await seasonService.create({
        name: "Past Season",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2020-12-31"),
      });

      await service.create({
        name: "Past Race",
        date: new Date("2020-06-15"),
        location: { name: "Old Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const upcoming = await service.getUpcoming();
      expect(upcoming).toHaveLength(0);
    });

    it("should return empty array when no upcoming races exist", async () => {
      const upcoming = await service.getUpcoming();
      expect(upcoming).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return race by ID", async () => {
      const season = await createSeason2024();
      const race = await service.create({
        name: "Find Me",
        date: new Date("2024-06-01"),
        location: { name: "Track" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });

      const found = await service.getById(race._id.toString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Find Me");
    });

    it("should return null for non-existent race", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return all races sorted by date descending", async () => {
      const season = await createSeason2024();

      await service.create({
        name: "Early Race",
        date: new Date("2024-02-01"),
        location: { name: "A" },
        raceType: "crit",
        seasonId: season._id.toString(),
      });
      await service.create({
        name: "Late Race",
        date: new Date("2024-11-01"),
        location: { name: "B" },
        raceType: "road_race",
        seasonId: season._id.toString(),
      });
      await service.create({
        name: "Mid Race",
        date: new Date("2024-06-01"),
        location: { name: "C" },
        raceType: "gravel",
        seasonId: season._id.toString(),
      });

      const races = await service.list();

      expect(races).toHaveLength(3);
      expect(races[0].name).toBe("Late Race");
      expect(races[1].name).toBe("Mid Race");
      expect(races[2].name).toBe("Early Race");
    });

    it("should return empty array when no races exist", async () => {
      const races = await service.list();
      expect(races).toHaveLength(0);
    });
  });
});
