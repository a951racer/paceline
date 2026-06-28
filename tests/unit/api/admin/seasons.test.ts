/**
 * Unit tests for admin seasons API routes
 * - GET /api/admin/seasons (list)
 * - POST /api/admin/seasons (create)
 * - GET /api/admin/seasons/[seasonId] (get by id)
 * - PUT /api/admin/seasons/[seasonId] (update)
 * - DELETE /api/admin/seasons/[seasonId] (delete)
 * - POST /api/admin/seasons/[seasonId]/activate (activate)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockSeasonCreate = jest.fn();
const mockSeasonGetActive = jest.fn();
const mockSeasonValidateNoOverlap = jest.fn();
const mockSeasonMarkInactive = jest.fn();
const mockSeasonActivate = jest.fn();
const mockSeasonGetById = jest.fn();
const mockSeasonList = jest.fn();

jest.mock("@/services/season.service", () => ({
  SeasonService: jest.fn().mockImplementation(() => ({
    create: mockSeasonCreate,
    getActive: mockSeasonGetActive,
    validateNoOverlap: mockSeasonValidateNoOverlap,
    markInactive: mockSeasonMarkInactive,
    activate: mockSeasonActivate,
    getById: mockSeasonGetById,
    list: mockSeasonList,
  })),
}));

const mockSeasonFindByIdAndUpdate = jest.fn();
const mockSeasonFindByIdAndDelete = jest.fn();
jest.mock("@/models/season.model", () => ({
  SeasonModel: {
    findByIdAndUpdate: (...args: unknown[]) => mockSeasonFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: unknown[]) => mockSeasonFindByIdAndDelete(...args),
  },
}));

jest.mock("@/middleware/auth", () => ({
  withAdmin: (handler: Function) => (request: Request) =>
    handler(request, { userId: "admin-1", email: "admin@test.com", roles: ["administrator"] }),
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

import { GET, POST } from "@/app/api/admin/seasons/route";
import {
  GET as GET_BY_ID,
  PUT as UPDATE,
  DELETE as DELETE_SEASON,
} from "@/app/api/admin/seasons/[seasonId]/route";
import { POST as ACTIVATE } from "@/app/api/admin/seasons/[seasonId]/activate/route";

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

describe("GET /api/admin/seasons", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with list of seasons", async () => {
    const mockSeasons = [
      { _id: "s1", name: "2024 Season", startDate: "2024-01-01", endDate: "2024-12-31", isActive: true },
    ];
    mockSeasonList.mockResolvedValue(mockSeasons);

    const req = createRequest("http://localhost/api/admin/seasons", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockSeasons);
  });

  it("returns 500 on internal error", async () => {
    mockSeasonList.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest("http://localhost/api/admin/seasons", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("POST /api/admin/seasons", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 201 on successful creation", async () => {
    const seasonData = { name: "2025 Season", startDate: "2025-01-01", endDate: "2025-12-31" };
    mockSeasonCreate.mockResolvedValue({ _id: "s-new", ...seasonData, isActive: false });

    const req = createRequest("http://localhost/api/admin/seasons", "POST", seasonData);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.name).toBe("2025 Season");
  });

  it("returns 400 for missing required fields", async () => {
    const req = createRequest("http://localhost/api/admin/seasons", "POST", { name: "Only name" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for overlapping season", async () => {
    mockSeasonCreate.mockRejectedValue(
      new Error("Season date range overlaps with an existing season. Please choose a non-overlapping date range.")
    );

    const req = createRequest("http://localhost/api/admin/seasons", "POST", {
      name: "Overlapping",
      startDate: "2024-06-01",
      endDate: "2025-06-01",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("SEASON_OVERLAP");
  });
});

describe("GET /api/admin/seasons/[seasonId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with season data", async () => {
    const mockSeason = { _id: "s1", name: "2024 Season", isActive: true };
    mockSeasonGetById.mockResolvedValue(mockSeason);

    const req = createRequest("http://localhost/api/admin/seasons/s1", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data._id).toBe("s1");
  });

  it("returns 404 when season not found", async () => {
    mockSeasonGetById.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/seasons/missing", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/admin/seasons/[seasonId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful update (name only)", async () => {
    const updated = { _id: "s1", name: "Renamed Season", isActive: true };
    mockSeasonFindByIdAndUpdate.mockResolvedValue(updated);

    const req = createRequest("http://localhost/api/admin/seasons/s1", "PUT", { name: "Renamed Season" });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name).toBe("Renamed Season");
  });

  it("returns 409 when updated dates overlap", async () => {
    mockSeasonGetById.mockResolvedValue({
      _id: "s1",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });
    mockSeasonValidateNoOverlap.mockResolvedValue(false);

    const req = createRequest("http://localhost/api/admin/seasons/s1", "PUT", {
      startDate: "2024-06-01",
      endDate: "2025-06-01",
    });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("SEASON_OVERLAP");
  });

  it("returns 404 when season not found", async () => {
    mockSeasonFindByIdAndUpdate.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/seasons/missing", "PUT", { name: "New Name" });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/admin/seasons/[seasonId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockSeasonFindByIdAndDelete.mockResolvedValue({ _id: "s1" });

    const req = createRequest("http://localhost/api/admin/seasons/s1", "DELETE");
    const res = await DELETE_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Season deleted successfully");
  });

  it("returns 404 when season not found", async () => {
    mockSeasonFindByIdAndDelete.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/seasons/missing", "DELETE");
    const res = await DELETE_SEASON(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/admin/seasons/[seasonId]/activate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful activation", async () => {
    const activated = { _id: "s1", name: "2024 Season", isActive: true };
    mockSeasonActivate.mockResolvedValue(activated);

    const req = createRequest("http://localhost/api/admin/seasons/s1/activate", "POST");
    const res = await ACTIVATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.isActive).toBe(true);
  });

  it("returns 404 when season not found", async () => {
    mockSeasonActivate.mockRejectedValue(
      new Error('Season with id "missing" not found')
    );

    const req = createRequest("http://localhost/api/admin/seasons/missing/activate", "POST");
    const res = await ACTIVATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});
