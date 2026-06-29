/**
 * Unit tests for admin races API routes
 * - GET /api/admin/races (list)
 * - POST /api/admin/races (create)
 * - GET /api/admin/races/[raceId] (get by id)
 * - PUT /api/admin/races/[raceId] (update)
 * - DELETE /api/admin/races/[raceId] (delete)
 * - GET /api/admin/races/[raceId]/results (get results)
 * - POST /api/admin/races/[raceId]/results (enter results batch)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockRaceCreate = jest.fn();
const mockRaceUpdate = jest.fn();
const mockRaceGetById = jest.fn();
const mockRaceList = jest.fn();

jest.mock("@/services/race.service", () => ({
  RaceService: jest.fn().mockImplementation(() => ({
    create: mockRaceCreate,
    update: mockRaceUpdate,
    getById: mockRaceGetById,
    list: mockRaceList,
  })),
}));

const mockResultEnter = jest.fn();
const mockResultGetByRace = jest.fn();

jest.mock("@/services/race-result.service", () => ({
  RaceResultService: jest.fn().mockImplementation(() => ({
    enter: mockResultEnter,
    getByRace: mockResultGetByRace,
  })),
}));

const mockRaceFindByIdAndDelete = jest.fn();
jest.mock("@/models/race.model", () => ({
  RaceModel: {
    findByIdAndDelete: (...args: unknown[]) => mockRaceFindByIdAndDelete(...args),
  },
}));

jest.mock("@/middleware/auth", () => ({
  withAdmin: (handler: Function) => (request: Request) =>
    handler(request, { userId: "admin-1", email: "admin@test.com", roles: ["administrator"] }),
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

const mockValidateKeys = jest.fn();

jest.mock("@/services/reference-data.service", () => ({
  ReferenceDataService: jest.fn().mockImplementation(() => ({
    validateKeys: mockValidateKeys,
  })),
}));

import { GET, POST } from "@/app/api/admin/races/route";
import {
  GET as GET_BY_ID,
  PUT as UPDATE,
  DELETE as DELETE_RACE,
} from "@/app/api/admin/races/[raceId]/route";
import {
  GET as GET_RESULTS,
  POST as POST_RESULTS,
} from "@/app/api/admin/races/[raceId]/results/route";

function createRequest(url: string, method: string, body?: unknown): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

describe("GET /api/admin/races", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with list of races", async () => {
    const mockRaces = [
      { _id: "r1", name: "Spring Crit", raceType: "crit" },
    ];
    mockRaceList.mockResolvedValue(mockRaces);

    const req = createRequest("http://localhost/api/admin/races?leagueId=league-1", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockRaces);
  });

  it("returns 500 on internal error", async () => {
    mockRaceList.mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/admin/races?leagueId=league-1", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("POST /api/admin/races", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateKeys.mockResolvedValue(true);
  });

  it("returns 201 on successful creation", async () => {
    const raceData = {
      name: "Summer Road Race",
      date: "2024-07-15",
      location: { name: "Downtown Circuit" },
      raceType: "road_race",
      seasonId: "season-1",
    };
    mockRaceCreate.mockResolvedValue({ _id: "r-new", ...raceData });

    const req = createRequest("http://localhost/api/admin/races?leagueId=league-1", "POST", raceData);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.name).toBe("Summer Road Race");
  });

  it("returns 400 for missing required fields", async () => {
    const req = createRequest("http://localhost/api/admin/races?leagueId=league-1", "POST", { name: "Only name" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when leagueId query param is missing", async () => {
    const req = createRequest("http://localhost/api/admin/races", "POST", {
      name: "Race",
      date: "2024-07-15",
      location: { name: "Somewhere" },
      raceType: "crit",
      seasonId: "s1",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("LEAGUE_REQUIRED");
  });
});

describe("GET /api/admin/races/[raceId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with race data", async () => {
    const mockRace = { _id: "r1", name: "Spring Crit", raceType: "crit" };
    mockRaceGetById.mockResolvedValue(mockRace);

    const req = createRequest("http://localhost/api/admin/races/r1", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data._id).toBe("r1");
  });

  it("returns 404 when race not found", async () => {
    mockRaceGetById.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/races/missing", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/admin/races/[raceId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful update", async () => {
    const updated = { _id: "r1", name: "Updated Crit", raceType: "crit" };
    mockRaceUpdate.mockResolvedValue(updated);

    const req = createRequest("http://localhost/api/admin/races/r1", "PUT", { name: "Updated Crit" });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name).toBe("Updated Crit");
  });

  it("returns 404 when race not found", async () => {
    mockRaceUpdate.mockRejectedValue(new Error('Race with id "missing" not found'));

    const req = createRequest("http://localhost/api/admin/races/missing", "PUT", { name: "New Name" });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/admin/races/[raceId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockRaceFindByIdAndDelete.mockResolvedValue({ _id: "r1" });

    const req = createRequest("http://localhost/api/admin/races/r1", "DELETE");
    const res = await DELETE_RACE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Race deleted successfully");
  });

  it("returns 404 when race not found", async () => {
    mockRaceFindByIdAndDelete.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/races/missing", "DELETE");
    const res = await DELETE_RACE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/admin/races/[raceId]/results", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with results for a race", async () => {
    const mockResults = [
      { _id: "res1", raceId: "r1", racerId: "p1", position: 1 },
      { _id: "res2", raceId: "r1", racerId: "p2", position: 2 },
    ];
    mockResultGetByRace.mockResolvedValue(mockResults);

    const req = createRequest("http://localhost/api/admin/races/r1/results", "GET");
    const res = await GET_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(2);
  });
});

describe("POST /api/admin/races/[raceId]/results", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 201 on successful batch result entry", async () => {
    const results = [
      { racerId: "p1", category: "cat3", position: 1, finishTime: 3600000 },
      { racerId: "p2", category: "cat3", position: 2, finishTime: 3660000 },
    ];
    mockResultEnter.mockResolvedValue({
      successful: results.map((r, i) => ({ _id: `res${i}`, raceId: "r1", ...r })),
      errors: [],
    });

    const req = createRequest("http://localhost/api/admin/races/r1/results", "POST", results);
    const res = await POST_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.successful).toHaveLength(2);
    expect(data.data.errors).toHaveLength(0);
  });

  it("returns 400 for invalid input (not an array)", async () => {
    const req = createRequest("http://localhost/api/admin/races/r1/results", "POST", { racerId: "p1" });
    const res = await POST_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty array", async () => {
    const req = createRequest("http://localhost/api/admin/races/r1/results", "POST", []);
    const res = await POST_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when all results fail", async () => {
    mockResultEnter.mockResolvedValue({
      successful: [],
      errors: [{ racerId: "bad-id", reason: "Racer not found" }],
    });

    const results = [
      { racerId: "bad-id", category: "cat3", position: 1, finishTime: 3600000 },
    ];
    const req = createRequest("http://localhost/api/admin/races/r1/results", "POST", results);
    const res = await POST_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("ALL_RESULTS_FAILED");
  });

  it("returns 404 when race not found", async () => {
    mockResultEnter.mockRejectedValue(new Error('Race with id "missing" not found'));

    const results = [
      { racerId: "p1", category: "cat3", position: 1, finishTime: 3600000 },
    ];
    const req = createRequest("http://localhost/api/admin/races/missing/results", "POST", results);
    const res = await POST_RESULTS(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});
