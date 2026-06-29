import {
  createPersonSchema,
  updatePersonSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  createSeasonSchema,
  updateSeasonSchema,
  createRaceSchema,
  updateRaceSchema,
  createRaceResultSchema,
  updateRaceResultSchema,
  createCompetitionSchema,
  updateCompetitionSchema,
  createAchievementSchema,
  updateAchievementSchema,
  createAwardSchema,
  updateAwardSchema,
  createPeerNominationSchema,
  updateBrandingSchema,
  createCalculatedRecognitionSchema,
  updateCalculatedRecognitionSchema,
} from "@/lib/validations";

describe("Zod Validation Schemas", () => {
  // --- Person ---
  describe("Person schemas", () => {
    it("validates a valid person creation", () => {
      const result = createPersonSchema.safeParse({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["racer"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects person with missing first name", () => {
      const result = createPersonSchema.safeParse({
        name: { first: "", last: "Doe" },
        email: "jane@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects person with invalid email", () => {
      const result = createPersonSchema.safeParse({
        name: { first: "Jane", last: "Doe" },
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects person with invalid role", () => {
      const result = createPersonSchema.safeParse({
        name: { first: "Jane", last: "Doe" },
        email: "jane@example.com",
        roles: ["invalid_role"],
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updatePersonSchema.safeParse({
        email: "new@example.com",
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Organization ---
  describe("Organization schemas", () => {
    it("validates a valid organization creation", () => {
      const result = createOrganizationSchema.safeParse({
        name: "Fast Wheels",
        type: "team",
      });
      expect(result.success).toBe(true);
    });

    it("rejects organization with empty name", () => {
      const result = createOrganizationSchema.safeParse({
        name: "",
        type: "team",
      });
      expect(result.success).toBe(false);
    });

    it("accepts organization with any non-empty type string (runtime validation against reference data)", () => {
      const result = createOrganizationSchema.safeParse({
        name: "Fast Wheels",
        type: "invalid_type",
      });
      expect(result.success).toBe(true);
    });

    it("rejects organization with empty type", () => {
      const result = createOrganizationSchema.safeParse({
        name: "Fast Wheels",
        type: "",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateOrganizationSchema.safeParse({
        description: "A new description",
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Season ---
  describe("Season schemas", () => {
    it("validates a valid season creation", () => {
      const result = createSeasonSchema.safeParse({
        name: "2024 Season",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("rejects season where startDate >= endDate", () => {
      const result = createSeasonSchema.safeParse({
        name: "Bad Season",
        startDate: "2024-12-31",
        endDate: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects season with same start and end date", () => {
      const result = createSeasonSchema.safeParse({
        name: "Same Day",
        startDate: "2024-06-01",
        endDate: "2024-06-01",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update with valid dates", () => {
      const result = updateSeasonSchema.safeParse({
        name: "Updated Season",
      });
      expect(result.success).toBe(true);
    });

    it("rejects partial update when both dates provided and invalid", () => {
      const result = updateSeasonSchema.safeParse({
        startDate: "2024-12-31",
        endDate: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });
  });

  // --- Race ---
  describe("Race schemas", () => {
    it("validates a valid race creation", () => {
      const result = createRaceSchema.safeParse({
        name: "Spring Crit",
        date: "2024-04-15",
        location: { name: "City Park" },
        raceType: "crit",
        leagueId: "league123",
        seasonId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects race with missing location name", () => {
      const result = createRaceSchema.safeParse({
        name: "Spring Crit",
        date: "2024-04-15",
        location: { name: "" },
        raceType: "crit",
        leagueId: "league123",
        seasonId: "abc123",
      });
      expect(result.success).toBe(false);
    });

    it("accepts race with any non-empty raceType string (runtime validation against reference data)", () => {
      const result = createRaceSchema.safeParse({
        name: "Spring Crit",
        date: "2024-04-15",
        location: { name: "City Park" },
        raceType: "marathon",
        leagueId: "league123",
        seasonId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects race with empty raceType", () => {
      const result = createRaceSchema.safeParse({
        name: "Spring Crit",
        date: "2024-04-15",
        location: { name: "City Park" },
        raceType: "",
        leagueId: "league123",
        seasonId: "abc123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects race with invalid status", () => {
      const result = createRaceSchema.safeParse({
        name: "Spring Crit",
        date: "2024-04-15",
        location: { name: "City Park" },
        raceType: "crit",
        leagueId: "league123",
        seasonId: "abc123",
        status: "running",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateRaceSchema.safeParse({
        status: "completed",
      });
      expect(result.success).toBe(true);
    });
  });

  // --- RaceResult ---
  describe("RaceResult schemas", () => {
    it("validates a valid race result", () => {
      const result = createRaceResultSchema.safeParse({
        raceId: "race1",
        racerId: "racer1",
        seasonId: "season1",
        category: "cat3",
        position: 1,
        finishTime: 3600000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects result with position < 1", () => {
      const result = createRaceResultSchema.safeParse({
        raceId: "race1",
        racerId: "racer1",
        seasonId: "season1",
        category: "cat3",
        position: 0,
        finishTime: 3600000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects result with negative finishTime", () => {
      const result = createRaceResultSchema.safeParse({
        raceId: "race1",
        racerId: "racer1",
        seasonId: "season1",
        category: "cat3",
        position: 1,
        finishTime: -1,
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateRaceResultSchema.safeParse({
        position: 3,
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Competition ---
  describe("Competition schemas", () => {
    it("validates a valid competition creation", () => {
      const result = createCompetitionSchema.safeParse({
        name: "Overall League Championship",
        leagueId: "league1",
        seasonId: "season1",
        type: "individual",
        scoringMethod: { type: "points", pointsTable: { "1": 25, "2": 20 } },
        eligibilityCriteria: {
          racerCriteria: { categories: ["cat3", "cat4"] },
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects competition with invalid type", () => {
      const result = createCompetitionSchema.safeParse({
        name: "Bad Competition",
        leagueId: "league1",
        seasonId: "season1",
        type: "pairs",
        scoringMethod: { type: "points" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects competition with invalid scoring method type", () => {
      const result = createCompetitionSchema.safeParse({
        name: "Bad Competition",
        leagueId: "league1",
        seasonId: "season1",
        type: "individual",
        scoringMethod: { type: "laps" },
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateCompetitionSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Achievement ---
  describe("Achievement schemas", () => {
    it("validates a valid achievement creation", () => {
      const result = createAchievementSchema.safeParse({
        name: "First Race",
        description: "Complete your first race",
        triggerCriteria: { type: "races_completed", threshold: 1 },
        badgeUrl: "https://example.com/badge.png",
      });
      expect(result.success).toBe(true);
    });

    it("rejects achievement with threshold < 1", () => {
      const result = createAchievementSchema.safeParse({
        name: "Bad Achievement",
        description: "Should fail",
        triggerCriteria: { type: "races_completed", threshold: 0 },
        badgeUrl: "https://example.com/badge.png",
      });
      expect(result.success).toBe(false);
    });

    it("rejects achievement with invalid badgeUrl", () => {
      const result = createAchievementSchema.safeParse({
        name: "Bad Badge",
        description: "Should fail",
        triggerCriteria: { type: "races_completed", threshold: 5 },
        badgeUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateAchievementSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Award ---
  describe("Award schemas", () => {
    it("validates a valid award creation", () => {
      const result = createAwardSchema.safeParse({
        name: "Sportsmanship",
        description: "Awarded for great sportsmanship",
        badgeUrl: "https://example.com/sportsmanship.png",
        nominationType: "peer_nominated",
      });
      expect(result.success).toBe(true);
    });

    it("rejects award with invalid nominationType", () => {
      const result = createAwardSchema.safeParse({
        name: "Bad Award",
        description: "Should fail",
        badgeUrl: "https://example.com/badge.png",
        nominationType: "self_nominated",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateAwardSchema.safeParse({
        description: "Updated description",
      });
      expect(result.success).toBe(true);
    });
  });

  // --- PeerNomination ---
  describe("PeerNomination schema", () => {
    it("validates a valid peer nomination", () => {
      const result = createPeerNominationSchema.safeParse({
        nominatorId: "person1",
        nomineeId: "person2",
        awardId: "award1",
        seasonId: "season1",
        reason: "Great teammate",
      });
      expect(result.success).toBe(true);
    });

    it("rejects self-nomination", () => {
      const result = createPeerNominationSchema.safeParse({
        nominatorId: "person1",
        nomineeId: "person1",
        awardId: "award1",
        seasonId: "season1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects nomination with missing nomineeId", () => {
      const result = createPeerNominationSchema.safeParse({
        nominatorId: "person1",
        nomineeId: "",
        awardId: "award1",
        seasonId: "season1",
      });
      expect(result.success).toBe(false);
    });
  });

  // --- Branding ---
  describe("Branding schema", () => {
    it("validates valid branding configuration", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "#33FF57", "#3357FF"],
        accentColors: ["#AABB00"],
      });
      expect(result.success).toBe(true);
    });

    it("validates branding with 2 accent colors", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "#33FF57", "#3357FF"],
        accentColors: ["#AABB00", "#CC1122"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects branding with invalid hex color", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "not-hex", "#3357FF"],
        accentColors: ["#AABB00"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects branding with wrong number of main colors", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "#33FF57"],
        accentColors: ["#AABB00"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects branding with empty accent colors", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "#33FF57", "#3357FF"],
        accentColors: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects branding with 3 accent colors", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
          vertical: "https://example.com/vertical.png",
        },
        mainColors: ["#FF5733", "#33FF57", "#3357FF"],
        accentColors: ["#AA0000", "#BB0000", "#CC0000"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects branding with missing logo variant", () => {
      const result = updateBrandingSchema.safeParse({
        leagueName: "City Racing League",
        logos: {
          square: "https://example.com/square.png",
          horizontal: "https://example.com/horizontal.png",
        },
        mainColors: ["#FF5733", "#33FF57", "#3357FF"],
        accentColors: ["#AABB00"],
      });
      expect(result.success).toBe(false);
    });
  });

  // --- CalculatedRecognition ---
  describe("CalculatedRecognition schemas", () => {
    it("validates a valid calculated recognition creation", () => {
      const result = createCalculatedRecognitionSchema.safeParse({
        name: "Most Improved",
        description: "Biggest improvement over time",
        computationMethod: "most_improved",
        criteria: { timePeriodDays: 30 },
        badgeUrl: "https://example.com/improved.png",
      });
      expect(result.success).toBe(true);
    });

    it("rejects recognition with invalid computation method", () => {
      const result = createCalculatedRecognitionSchema.safeParse({
        name: "Bad Recognition",
        description: "Should fail",
        computationMethod: "invalid_method",
        badgeUrl: "https://example.com/badge.png",
      });
      expect(result.success).toBe(false);
    });

    it("allows partial update", () => {
      const result = updateCalculatedRecognitionSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });
});
