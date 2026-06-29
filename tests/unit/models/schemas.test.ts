import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { PersonModel } from "@/models/person.model";
import { OrganizationModel } from "@/models/organization.model";
import { SeasonModel } from "@/models/season.model";
import { RaceModel } from "@/models/race.model";
import { RaceResultModel } from "@/models/race-result.model";
import { CompetitionModel } from "@/models/competition.model";
import { StandingModel, TeamStandingModel } from "@/models/standing.model";
import {
  AchievementModel,
  EarnedAchievementModel,
} from "@/models/achievement.model";
import {
  AwardModel,
  AssignedAwardModel,
  PeerNominationModel,
} from "@/models/award.model";
import {
  CalculatedRecognitionModel,
  EarnedRecognitionModel,
} from "@/models/calculated-recognition.model";
import { BrandingConfigurationModel } from "@/models/branding.model";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Ensure all indexes are created before running tests
  await mongoose.connection.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Person Model", () => {
  it("should create a person with required fields", async () => {
    const person = await PersonModel.create({
      name: { first: "John", last: "Doe" },
      email: "john@example.com",
      roles: ["racer"],
      isRegistered: true,
    });

    expect(person.name.first).toBe("John");
    expect(person.name.last).toBe("Doe");
    expect(person.roles).toContain("racer");
    expect(person.isRegistered).toBe(true);
    expect(person.createdAt).toBeDefined();
  });

  it("should enforce unique email", async () => {
    await PersonModel.create({
      name: { first: "John", last: "Doe" },
      email: "duplicate@example.com",
      roles: [],
      isRegistered: false,
    });

    await expect(
      PersonModel.create({
        name: { first: "Jane", last: "Smith" },
        email: "duplicate@example.com",
        roles: [],
        isRegistered: false,
      })
    ).rejects.toThrow();
  });

  it("should reject invalid role values", async () => {
    await expect(
      PersonModel.create({
        name: { first: "John", last: "Doe" },
        email: "invalid-role@example.com",
        roles: ["invalid_role"],
        isRegistered: false,
      })
    ).rejects.toThrow();
  });

  it("should store categoryHistory entries", async () => {
    const person = await PersonModel.create({
      name: { first: "Alice", last: "Fast" },
      email: "alice@example.com",
      roles: ["racer"],
      category: "cat3",
      categoryHistory: [
        {
          from: null,
          to: "cat5",
          changedAt: new Date("2024-01-01"),
          changedBy: "admin1",
        },
        {
          from: "cat5",
          to: "cat3",
          changedAt: new Date("2024-06-01"),
          changedBy: "admin1",
        },
      ],
      isRegistered: true,
    });

    expect(person.categoryHistory).toHaveLength(2);
    expect(person.categoryHistory[0].from).toBeNull();
    expect(person.categoryHistory[1].to).toBe("cat3");
  });
});

describe("Organization Model", () => {
  it("should create an organization with required fields", async () => {
    const org = await OrganizationModel.create({
      name: "Speed Demons",
      type: "team",
    });

    expect(org.name).toBe("Speed Demons");
    expect(org.type).toBe("team");
    expect(org.memberIds).toHaveLength(0);
  });

  it("should enforce unique name", async () => {
    await OrganizationModel.create({ name: "Unique Team", type: "team" });
    await expect(
      OrganizationModel.create({ name: "Unique Team", type: "sponsor" })
    ).rejects.toThrow();
  });

  it("should accept any type string (enum removed, validated at runtime against reference data)", async () => {
    const org = await OrganizationModel.create({ name: "Bad Type", type: "invalid" });
    expect(org.type).toBe("invalid");
  });
});

describe("Season Model", () => {
  it("should create a season with date range and isActive", async () => {
    const season = await SeasonModel.create({
      name: "2024 Season",
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-10-31"),
      isActive: true,
      leagueId: new mongoose.Types.ObjectId(),
    });

    expect(season.name).toBe("2024 Season");
    expect(season.isActive).toBe(true);
    expect(season.startDate).toEqual(new Date("2024-03-01"));
  });

  it("should default isActive to false", async () => {
    const season = await SeasonModel.create({
      name: "Future Season",
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-10-31"),
      leagueId: new mongoose.Types.ObjectId(),
    });

    expect(season.isActive).toBe(false);
  });
});

describe("Race Model", () => {
  it("should create a race with location subdocument", async () => {
    const seasonId = new mongoose.Types.ObjectId();
    const race = await RaceModel.create({
      name: "Spring Classic",
      date: new Date("2024-04-15"),
      location: {
        name: "Central Park",
        address: "123 Park Ave",
        coordinates: { lat: 40.7829, lng: -73.9654 },
      },
      raceType: "crit",
      categories: ["cat3", "cat4"],
      leagueId: new mongoose.Types.ObjectId(),
      seasonId,
      status: "scheduled",
    });

    expect(race.location.name).toBe("Central Park");
    expect(race.location.coordinates?.lat).toBe(40.7829);
    expect(race.raceType).toBe("crit");
    expect(race.categories).toContain("cat3");
  });

  it("should accept any raceType string (enum removed, validated at runtime against reference data)", async () => {
    const seasonId = new mongoose.Types.ObjectId();
    const race = await RaceModel.create({
      name: "Custom Race",
      date: new Date(),
      location: { name: "Somewhere" },
      raceType: "custom_type",
      leagueId: new mongoose.Types.ObjectId(),
      seasonId,
    });
    expect(race.raceType).toBe("custom_type");
  });
});

describe("RaceResult Model", () => {
  it("should enforce unique compound index on {raceId, racerId}", async () => {
    const raceId = new mongoose.Types.ObjectId();
    const racerId = new mongoose.Types.ObjectId();
    const seasonId = new mongoose.Types.ObjectId();

    await RaceResultModel.create({
      raceId,
      racerId,
      seasonId,
      leagueId: new mongoose.Types.ObjectId(),
      category: "cat3",
      position: 1,
      finishTime: 3600000,
    });

    await expect(
      RaceResultModel.create({
        raceId,
        racerId,
        seasonId,
        leagueId: new mongoose.Types.ObjectId(),
        category: "cat3",
        position: 2,
        finishTime: 3700000,
      })
    ).rejects.toThrow();
  });
});

describe("Competition Model", () => {
  it("should create a competition with scoring method and eligibility", async () => {
    const seasonId = new mongoose.Types.ObjectId();
    const competition = await CompetitionModel.create({
      name: "Overall League Champion",
      seasonId,
      leagueId: new mongoose.Types.ObjectId(),
      type: "individual",
      scoringMethod: {
        type: "points",
        pointsTable: { "1": 25, "2": 20, "3": 16 },
        countBestN: 10,
      },
      eligibilityCriteria: {
        racerCriteria: { categories: ["cat3", "cat4"], minRaces: 3 },
        raceCriteria: { raceTypes: ["crit", "road_race"] },
      },
    });

    expect(competition.name).toBe("Overall League Champion");
    expect(competition.scoringMethod.type).toBe("points");
    expect(competition.scoringMethod.countBestN).toBe(10);
    expect(competition.eligibilityCriteria.racerCriteria?.minRaces).toBe(3);
  });
});

describe("Achievement and EarnedAchievement Models", () => {
  it("should create an achievement with trigger criteria", async () => {
    const achievement = await AchievementModel.create({
      name: "5 Races Badge",
      description: "Complete 5 races in a season",
      triggerCriteria: { type: "races_completed", threshold: 5 },
      badgeUrl: "https://example.com/badge.png",
    });

    expect(achievement.triggerCriteria.threshold).toBe(5);
  });

  it("should enforce unique compound index on EarnedAchievement {achievementId, personId, seasonId}", async () => {
    const achievementId = new mongoose.Types.ObjectId();
    const personId = new mongoose.Types.ObjectId();
    const seasonId = new mongoose.Types.ObjectId();
    const leagueId = new mongoose.Types.ObjectId();

    await EarnedAchievementModel.create({
      achievementId,
      personId,
      seasonId,
      leagueId,
      earnedAt: new Date(),
      racesAtTime: 5,
    });

    await expect(
      EarnedAchievementModel.create({
        achievementId,
        personId,
        seasonId,
        leagueId,
        earnedAt: new Date(),
        racesAtTime: 6,
      })
    ).rejects.toThrow();
  });
});

describe("PeerNomination Model", () => {
  it("should reject self-nomination (nominatorId === nomineeId)", async () => {
    const personId = new mongoose.Types.ObjectId();
    const awardId = new mongoose.Types.ObjectId();
    const seasonId = new mongoose.Types.ObjectId();

    await expect(
      PeerNominationModel.create({
        nominatorId: personId,
        nomineeId: personId,
        awardId,
        seasonId,
        status: "pending",
      })
    ).rejects.toThrow();
  });

  it("should allow nomination of a different person", async () => {
    const nominatorId = new mongoose.Types.ObjectId();
    const nomineeId = new mongoose.Types.ObjectId();
    const awardId = new mongoose.Types.ObjectId();
    const seasonId = new mongoose.Types.ObjectId();

    const nomination = await PeerNominationModel.create({
      nominatorId,
      nomineeId,
      awardId,
      seasonId,
      reason: "Great sportsmanship",
      status: "pending",
    });

    expect(nomination.status).toBe("pending");
    expect(nomination.reason).toBe("Great sportsmanship");
  });
});

describe("BrandingConfiguration Model", () => {
  it("should validate exactly 3 main colors", async () => {
    const updatedBy = new mongoose.Types.ObjectId();

    await expect(
      BrandingConfigurationModel.create({
        leagueName: "Speed League",
        logos: {
          square: "https://example.com/sq.png",
          horizontal: "https://example.com/hz.png",
          vertical: "https://example.com/vt.png",
        },
        mainColors: ["#ff0000", "#00ff00"], // only 2
        accentColors: ["#0000ff"],
        updatedBy,
      })
    ).rejects.toThrow(/mainColors must contain exactly 3 colors/);
  });

  it("should validate 1 or 2 accent colors", async () => {
    const updatedBy = new mongoose.Types.ObjectId();

    await expect(
      BrandingConfigurationModel.create({
        leagueName: "Speed League",
        logos: {
          square: "https://example.com/sq.png",
          horizontal: "https://example.com/hz.png",
          vertical: "https://example.com/vt.png",
        },
        mainColors: ["#ff0000", "#00ff00", "#0000ff"],
        accentColors: ["#111", "#222", "#333"], // 3 accent colors - invalid
        updatedBy,
      })
    ).rejects.toThrow(/accentColors must contain 1 or 2 colors/);
  });

  it("should accept valid branding configuration", async () => {
    const updatedBy = new mongoose.Types.ObjectId();

    const branding = await BrandingConfigurationModel.create({
      leagueName: "Speed League",
      logos: {
        square: "https://example.com/sq.png",
        horizontal: "https://example.com/hz.png",
        vertical: "https://example.com/vt.png",
      },
      mainColors: ["#ff0000", "#00ff00", "#0000ff"],
      accentColors: ["#ffcc00", "#cc00ff"],
      updatedBy,
    });

    expect(branding.leagueName).toBe("Speed League");
    expect(branding.mainColors).toHaveLength(3);
    expect(branding.accentColors).toHaveLength(2);
  });
});

describe("Standing and TeamStanding Models", () => {
  it("should create a standing with results array", async () => {
    const standing = await StandingModel.create({
      competitionId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      racerId: new mongoose.Types.ObjectId(),
      leagueId: new mongoose.Types.ObjectId(),
      category: "cat3",
      totalPoints: 75,
      totalRaces: 5,
      position: 2,
      results: [
        {
          raceId: new mongoose.Types.ObjectId(),
          position: 1,
          points: 25,
          finishTime: 3600000,
        },
        {
          raceId: new mongoose.Types.ObjectId(),
          position: 3,
          points: 16,
          finishTime: 3700000,
        },
      ],
      lastUpdated: new Date(),
    });

    expect(standing.totalPoints).toBe(75);
    expect(standing.results).toHaveLength(2);
  });

  it("should create a team standing", async () => {
    const teamStanding = await TeamStandingModel.create({
      competitionId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      organizationId: new mongoose.Types.ObjectId(),
      leagueId: new mongoose.Types.ObjectId(),
      totalPoints: 150,
      totalRaces: 10,
      position: 1,
      memberResults: [
        {
          racerId: new mongoose.Types.ObjectId(),
          raceId: new mongoose.Types.ObjectId(),
          points: 25,
        },
      ],
      lastUpdated: new Date(),
    });

    expect(teamStanding.totalPoints).toBe(150);
    expect(teamStanding.position).toBe(1);
  });
});
