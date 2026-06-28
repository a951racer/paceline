/**
 * Unit tests for public standings API routes
 * - GET /api/standings (current standings for active season)
 * - GET /api/standings/[seasonId] (historical standings)
 * - GET /api/standings/team (team standings for active season)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockSeasonGetActive = jest.fn();
const mockSeasonGetById = jest.fn();

jest.mock("@/services/season.service", () => ({
  SeasonService: jest.fn().mockImplementation(() => ({
    getActive: mockSeasonGetActive,
    getById: mockSeasonGetById,
  })),
}));

const mockStandingFind = jest.fn();
const mockTeamStandingFind = jest.fn();

jest.mock("@/models/standing.model", () => ({
  StandingModel: {
    find: (...args: unknown[]) => mockStandingFind(...args),
  },
  TeamStandingModel: {
    find: (...args: unknown[]) => mockTeamStandingFind(...args),
  },
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

import { GET as GET_STANDINGS } from "@/app/api/standings/route";
import { GET as GET_STANDINGS_BY_SEASON } from "@/app/api/standings/[seasonId]/route";
import { GET as GET_TEAM_STANDINGS } from "@/app/api/standings/team/route";

function createRequest(url: string): Request {
  return new Request(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/standings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });
  });

  it("returns 200 with empty data and message when no active season", async () => {
    mockSeasonGetActive.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/standings");
    const res = await GET_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.message).toBe("No active season found");
  });

  it("returns 200 with standings grouped by competitionId", async () => {
    const mockSeason = { _id: "season-1", name: "2024 Season" };
    mockSeasonGetActive.mockResolvedValue(mockSeason);

    const mockStandings = [
      { competitionId: { toString: () => "comp-1" }, position: 1, racerId: "racer-1", totalPoints: 100 },
      { competitionId: { toString: () => "comp-1" }, position: 2, racerId: "racer-2", totalPoints: 80 },
      { competitionId: { toString: () => "comp-2" }, position: 1, racerId: "racer-3", totalPoints: 50 },
    ];
    mockStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockStandings),
    });

    const req = createRequest("http://localhost/api/standings");
    const res = await GET_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.seasonId).toBe("season-1");
    expect(data.seasonName).toBe("2024 Season");
    expect(Object.keys(data.data)).toHaveLength(2);
    expect(data.data["comp-1"]).toHaveLength(2);
    expect(data.data["comp-2"]).toHaveLength(1);
  });

  it("returns 500 on internal error", async () => {
    mockSeasonGetActive.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest("http://localhost/api/standings");
    const res = await GET_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("GET /api/standings/[seasonId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });
  });

  it("returns 404 when season not found", async () => {
    mockSeasonGetById.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/standings/nonexistent-id");
    const res = await GET_STANDINGS_BY_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("SEASON_NOT_FOUND");
  });

  it("returns 200 with standings for a valid season", async () => {
    const mockSeason = { _id: "season-old", name: "2023 Season" };
    mockSeasonGetById.mockResolvedValue(mockSeason);

    const mockStandings = [
      { competitionId: { toString: () => "comp-1" }, position: 1, racerId: "racer-1", totalPoints: 200 },
    ];
    mockStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockStandings),
    });

    const req = createRequest("http://localhost/api/standings/season-old");
    const res = await GET_STANDINGS_BY_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.seasonId).toBe("season-old");
    expect(data.seasonName).toBe("2023 Season");
    expect(data.data["comp-1"]).toHaveLength(1);
  });

  it("returns 400 for invalid season ID format", async () => {
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    mockSeasonGetById.mockRejectedValue(castError);

    const req = createRequest("http://localhost/api/standings/invalid!id");
    const res = await GET_STANDINGS_BY_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("INVALID_SEASON_ID");
  });

  it("returns 500 on internal error", async () => {
    mockSeasonGetById.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest("http://localhost/api/standings/season-1");
    const res = await GET_STANDINGS_BY_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("GET /api/standings/team", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTeamStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });
  });

  it("returns 200 with empty data and message when no active season", async () => {
    mockSeasonGetActive.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/standings/team");
    const res = await GET_TEAM_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.message).toBe("No active season found");
  });

  it("returns 200 with team standings grouped by competitionId", async () => {
    const mockSeason = { _id: "season-1", name: "2024 Season" };
    mockSeasonGetActive.mockResolvedValue(mockSeason);

    const mockTeamStandings = [
      { competitionId: { toString: () => "comp-team-1" }, position: 1, organizationId: "team-1", totalPoints: 300 },
      { competitionId: { toString: () => "comp-team-1" }, position: 2, organizationId: "team-2", totalPoints: 250 },
    ];
    mockTeamStandingFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockTeamStandings),
    });

    const req = createRequest("http://localhost/api/standings/team");
    const res = await GET_TEAM_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.seasonId).toBe("season-1");
    expect(data.seasonName).toBe("2024 Season");
    expect(data.data["comp-team-1"]).toHaveLength(2);
  });

  it("returns 500 on internal error", async () => {
    mockSeasonGetActive.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest("http://localhost/api/standings/team");
    const res = await GET_TEAM_STANDINGS(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
