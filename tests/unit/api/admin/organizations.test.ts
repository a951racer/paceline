/**
 * Unit tests for admin organizations API routes
 * - GET /api/admin/organizations (list)
 * - POST /api/admin/organizations (create)
 * - GET /api/admin/organizations/[orgId] (get by id)
 * - PUT /api/admin/organizations/[orgId] (update)
 * - DELETE /api/admin/organizations/[orgId] (delete)
 * - POST /api/admin/organizations/[orgId]/members (add member)
 * - DELETE /api/admin/organizations/[orgId]/members (remove member)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockOrgCreate = jest.fn();
const mockOrgUpdate = jest.fn();
const mockOrgAddMember = jest.fn();
const mockOrgRemoveMember = jest.fn();
const mockOrgGetById = jest.fn();
const mockOrgList = jest.fn();

jest.mock("@/services/organization.service", () => ({
  OrganizationService: jest.fn().mockImplementation(() => ({
    create: mockOrgCreate,
    update: mockOrgUpdate,
    addMember: mockOrgAddMember,
    removeMember: mockOrgRemoveMember,
    getById: mockOrgGetById,
    list: mockOrgList,
  })),
}));

const mockOrgFindByIdAndDelete = jest.fn();
jest.mock("@/models/organization.model", () => ({
  OrganizationModel: {
    findByIdAndDelete: (...args: unknown[]) => mockOrgFindByIdAndDelete(...args),
  },
}));

jest.mock("@/middleware/auth", () => ({
  withAdmin: (handler: Function) => (request: Request) =>
    handler(request, { userId: "admin-1", email: "admin@test.com", roles: ["administrator"] }),
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

import { GET, POST } from "@/app/api/admin/organizations/route";
import {
  GET as GET_BY_ID,
  PUT as UPDATE,
  DELETE as DELETE_ORG,
} from "@/app/api/admin/organizations/[orgId]/route";
import {
  POST as ADD_MEMBER,
  DELETE as REMOVE_MEMBER,
} from "@/app/api/admin/organizations/[orgId]/members/route";

function createRequest(
  url: string,
  method: string,
  body?: unknown
): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

describe("GET /api/admin/organizations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with list of organizations", async () => {
    const mockOrgs = [
      { _id: "org1", name: "Team Alpha", type: "team" },
    ];
    mockOrgList.mockResolvedValue(mockOrgs);

    const req = createRequest("http://localhost/api/admin/organizations", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockOrgs);
  });

  it("passes type filter to service", async () => {
    mockOrgList.mockResolvedValue([]);

    const req = createRequest(
      "http://localhost/api/admin/organizations?type=team",
      "GET"
    );
    await GET(req);

    expect(mockOrgList).toHaveBeenCalledWith("team");
  });
});

describe("POST /api/admin/organizations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 201 on successful creation", async () => {
    const orgData = { name: "Team Beta", type: "team" };
    mockOrgCreate.mockResolvedValue({ _id: "org-new", ...orgData });

    const req = createRequest(
      "http://localhost/api/admin/organizations",
      "POST",
      orgData
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.name).toBe("Team Beta");
  });

  it("returns 400 for missing required fields", async () => {
    const req = createRequest(
      "http://localhost/api/admin/organizations",
      "POST",
      { description: "only description" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate name", async () => {
    mockOrgCreate.mockRejectedValue(
      new Error('An organization with the name "Team Alpha" already exists')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations",
      "POST",
      { name: "Team Alpha", type: "team" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("DUPLICATE_NAME");
  });
});

describe("GET /api/admin/organizations/[orgId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with organization data", async () => {
    const mockOrg = { _id: "org1", name: "Team Alpha", type: "team" };
    mockOrgGetById.mockResolvedValue(mockOrg);

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1",
      "GET"
    );
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data._id).toBe("org1");
  });

  it("returns 404 when organization not found", async () => {
    mockOrgGetById.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost/api/admin/organizations/missing",
      "GET"
    );
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/admin/organizations/[orgId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful update", async () => {
    const updated = { _id: "org1", name: "Updated Team", type: "team" };
    mockOrgUpdate.mockResolvedValue(updated);

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1",
      "PUT",
      { name: "Updated Team" }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name).toBe("Updated Team");
  });

  it("returns 404 when organization not found", async () => {
    mockOrgUpdate.mockRejectedValue(
      new Error('Organization with id "missing" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations/missing",
      "PUT",
      { name: "New Name" }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 409 for duplicate name on update", async () => {
    mockOrgUpdate.mockRejectedValue(
      new Error('An organization with the name "Existing" already exists')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1",
      "PUT",
      { name: "Existing" }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("DUPLICATE_NAME");
  });
});

describe("DELETE /api/admin/organizations/[orgId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockOrgFindByIdAndDelete.mockResolvedValue({ _id: "org1" });

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1",
      "DELETE"
    );
    const res = await DELETE_ORG(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Organization deleted successfully");
  });

  it("returns 404 when organization not found", async () => {
    mockOrgFindByIdAndDelete.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost/api/admin/organizations/missing",
      "DELETE"
    );
    const res = await DELETE_ORG(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/admin/organizations/[orgId]/members", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful member addition", async () => {
    mockOrgAddMember.mockResolvedValue(undefined);

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1/members",
      "POST",
      { personId: "person-1" }
    );
    const res = await ADD_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Member added successfully");
    expect(mockOrgAddMember).toHaveBeenCalledWith("org1", "person-1");
  });

  it("returns 400 for missing personId", async () => {
    const req = createRequest(
      "http://localhost/api/admin/organizations/org1/members",
      "POST",
      {}
    );
    const res = await ADD_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when organization not found", async () => {
    mockOrgAddMember.mockRejectedValue(
      new Error('Organization with id "missing" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations/missing/members",
      "POST",
      { personId: "person-1" }
    );
    const res = await ADD_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 404 when person not found", async () => {
    mockOrgAddMember.mockRejectedValue(
      new Error('Person with id "bad-person" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1/members",
      "POST",
      { personId: "bad-person" }
    );
    const res = await ADD_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/admin/organizations/[orgId]/members", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful member removal", async () => {
    mockOrgRemoveMember.mockResolvedValue(undefined);

    const req = createRequest(
      "http://localhost/api/admin/organizations/org1/members",
      "DELETE",
      { personId: "person-1" }
    );
    const res = await REMOVE_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
    expect(mockOrgRemoveMember).toHaveBeenCalledWith("org1", "person-1");
  });

  it("returns 400 for missing personId", async () => {
    const req = createRequest(
      "http://localhost/api/admin/organizations/org1/members",
      "DELETE",
      {}
    );
    const res = await REMOVE_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when organization not found", async () => {
    mockOrgRemoveMember.mockRejectedValue(
      new Error('Organization with id "missing" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/organizations/missing/members",
      "DELETE",
      { personId: "person-1" }
    );
    const res = await REMOVE_MEMBER(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});
