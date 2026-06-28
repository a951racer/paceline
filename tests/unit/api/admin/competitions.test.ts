/**
 * Unit tests for admin competitions API routes
 * - GET /api/admin/competitions (list, with optional seasonId filter)
 * - POST /api/admin/competitions (create)
 * - GET /api/admin/competitions/[competitionId] (get by id)
 * - PUT /api/admin/competitions/[competitionId] (update)
 * - DELETE /api/admin/competitions/[competitionId] (delete)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockCompetitionCreate = jest.fn();
const mockCompetitionGetById = jest.fn();
const mockCompetitionList = jest.fn();
const mockCompetitionUpdate = jest.fn();
const mockCompetitionGetActive = jest.fn();

jest.mock("@/services/competition.service", () => ({
  CompetitionService: jest.fn().mockImplementation(() => ({
    create: mockCompetitionCreate,
    getById: mockCompetitionGetById,
    list: mockCompetitionList,
    update: mockCompetitionUpdate,
    getActive: mockCompetitionGetActive,
  })),
}));

const mockCompetitionFindByIdAndDelete = jest.fn();
jest.mock("@/models/competition.model", () => ({
  CompetitionModel: {
    findByIdAndDelete: (...args: unknown[]) => mockCompetitionFindByIdAndDelete(...args),
  },
}));

jest.mock("@/middleware/auth", () => ({
  withAdmin: (handler: Function) => (request: Request) =>
    handler(request, { userId: "admin-1", email: "admin@test.com", roles: ["administrator"] }),
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

import { GET, POST } from "@/app/api/admin/competitions/route";
import {
  GET as GET_BY_ID,
  PUT as UPDATE,
  DELETE as DELETE_COMPETITION,
} from "@/app/api/admin/competitions/[competitionId]/route";

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

describe("GET /api/admin/competitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with list of competitions", async () => {
    const mockCompetitions = [
      { _id: "c1", name: "Overall League Champion", seasonId: "s1", type: "individual", isActive: true },
    ];
    mockCompetitionList.mockResolvedValue(mockCompetitions);

    const req = createRequest("http://localhost/api/admin/competitions", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockCompetitions);
    expect(mockCompetitionList).toHaveBeenCalledWith(undefined);
  });

  it("passes seasonId query parameter to service", async () => {
    mockCompetitionList.mockResolvedValue([]);

    const req = createRequest("http://localhost/api/admin/competitions?seasonId=s1", "GET");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockCompetitionList).toHaveBeenCalledWith("s1");
  });

  it("returns 500 on internal error", async () => {
    mockCompetitionList.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest("http://localhost/api/admin/competitions", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("POST /api/admin/competitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 201 on successful creation", async () => {
    const competitionData = {
      name: "Overall League Champion",
      seasonId: "s1",
      type: "individual",
      scoringMethod: { type: "points", pointsTable: { "1": 25, "2": 20, "3": 16 } },
    };
    mockCompetitionCreate.mockResolvedValue({ _id: "c-new", ...competitionData, isActive: true });

    const req = createRequest("http://localhost/api/admin/competitions", "POST", competitionData);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.name).toBe("Overall League Champion");
  });

  it("returns 400 for missing required fields", async () => {
    const req = createRequest("http://localhost/api/admin/competitions", "POST", { name: "Only name" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid scoring method type", async () => {
    const req = createRequest("http://localhost/api/admin/competitions", "POST", {
      name: "Bad Competition",
      seasonId: "s1",
      type: "individual",
      scoringMethod: { type: "invalid_type" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 on internal error", async () => {
    mockCompetitionCreate.mockRejectedValue(new Error("Unexpected error"));

    const req = createRequest("http://localhost/api/admin/competitions", "POST", {
      name: "Competition",
      seasonId: "s1",
      type: "individual",
      scoringMethod: { type: "points" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("GET /api/admin/competitions/[competitionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with competition data", async () => {
    const mockCompetition = { _id: "c1", name: "Overall League Champion", isActive: true };
    mockCompetitionGetById.mockResolvedValue(mockCompetition);

    const req = createRequest("http://localhost/api/admin/competitions/c1", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data._id).toBe("c1");
  });

  it("returns 404 when competition not found", async () => {
    mockCompetitionGetById.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/competitions/missing", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on internal error", async () => {
    mockCompetitionGetById.mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/admin/competitions/c1", "GET");
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("PUT /api/admin/competitions/[competitionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful update", async () => {
    const updated = { _id: "c1", name: "Renamed Competition", isActive: true };
    mockCompetitionUpdate.mockResolvedValue(updated);

    const req = createRequest("http://localhost/api/admin/competitions/c1", "PUT", {
      name: "Renamed Competition",
    });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name).toBe("Renamed Competition");
  });

  it("returns 400 for invalid input", async () => {
    const req = createRequest("http://localhost/api/admin/competitions/c1", "PUT", {
      scoringMethod: { type: "invalid" },
    });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when competition not found", async () => {
    mockCompetitionUpdate.mockRejectedValue(
      new Error('Competition with id "missing" not found')
    );

    const req = createRequest("http://localhost/api/admin/competitions/missing", "PUT", {
      name: "New Name",
    });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on unexpected error", async () => {
    mockCompetitionUpdate.mockRejectedValue(new Error("Unexpected DB failure"));

    const req = createRequest("http://localhost/api/admin/competitions/c1", "PUT", {
      name: "Updated",
    });
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});

describe("DELETE /api/admin/competitions/[competitionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockCompetitionFindByIdAndDelete.mockResolvedValue({ _id: "c1" });

    const req = createRequest("http://localhost/api/admin/competitions/c1", "DELETE");
    const res = await DELETE_COMPETITION(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Competition deleted successfully");
  });

  it("returns 404 when competition not found", async () => {
    mockCompetitionFindByIdAndDelete.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/admin/competitions/missing", "DELETE");
    const res = await DELETE_COMPETITION(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on internal error", async () => {
    mockCompetitionFindByIdAndDelete.mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/admin/competitions/c1", "DELETE");
    const res = await DELETE_COMPETITION(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
