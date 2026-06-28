/**
 * Unit tests for admin people API routes
 * - GET /api/admin/people (list)
 * - POST /api/admin/people (create)
 * - GET /api/admin/people/[personId] (get by id)
 * - PUT /api/admin/people/[personId] (update)
 * - DELETE /api/admin/people/[personId] (delete)
 * - PUT /api/admin/people/[personId]/roles (assign roles)
 * - DELETE /api/admin/people/[personId]/roles (remove role)
 */

// Mock dependencies before imports
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockPersonCreate = jest.fn();
const mockPersonUpdate = jest.fn();
const mockPersonAssignRoles = jest.fn();
const mockPersonRemoveRole = jest.fn();
const mockPersonGetById = jest.fn();
const mockPersonList = jest.fn();

jest.mock("@/services/person.service", () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    create: mockPersonCreate,
    update: mockPersonUpdate,
    assignRoles: mockPersonAssignRoles,
    removeRole: mockPersonRemoveRole,
    getById: mockPersonGetById,
    list: mockPersonList,
  })),
}));

const mockFindByIdAndDelete = jest.fn();
jest.mock("@/models/person.model", () => ({
  PersonModel: {
    findByIdAndDelete: (...args: unknown[]) => mockFindByIdAndDelete(...args),
  },
}));

jest.mock("@/middleware/auth", () => ({
  withAdmin: (handler: Function) => (request: Request) =>
    handler(request, { userId: "admin-1", email: "admin@test.com", roles: ["administrator"] }),
}));

jest.mock("@/middleware/rate-limit", () => ({
  withRateLimit: () => (handler: Function) => handler,
}));

import { GET, POST } from "@/app/api/admin/people/route";
import {
  GET as GET_BY_ID,
  PUT as UPDATE,
  DELETE as DELETE_PERSON,
} from "@/app/api/admin/people/[personId]/route";
import {
  PUT as ASSIGN_ROLES,
  DELETE as REMOVE_ROLE,
} from "@/app/api/admin/people/[personId]/roles/route";

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

describe("GET /api/admin/people", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with list of people", async () => {
    const mockPeople = [
      { _id: "1", name: { first: "John", last: "Doe" }, roles: ["racer"] },
    ];
    mockPersonList.mockResolvedValue(mockPeople);

    const req = createRequest("http://localhost/api/admin/people", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockPeople);
  });

  it("passes filter params to service", async () => {
    mockPersonList.mockResolvedValue([]);

    const req = createRequest(
      "http://localhost/api/admin/people?roles=racer,volunteer&category=cat3&name=John",
      "GET"
    );
    await GET(req);

    expect(mockPersonList).toHaveBeenCalledWith({
      roles: ["racer", "volunteer"],
      category: "cat3",
      name: "John",
    });
  });
});

describe("POST /api/admin/people", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 201 on successful creation", async () => {
    const personData = {
      name: { first: "Jane", last: "Smith" },
      email: "jane@example.com",
      roles: ["racer"],
    };
    mockPersonCreate.mockResolvedValue({ _id: "new-1", ...personData });

    const req = createRequest(
      "http://localhost/api/admin/people",
      "POST",
      personData
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.name.first).toBe("Jane");
  });

  it("returns 400 for invalid input", async () => {
    const req = createRequest(
      "http://localhost/api/admin/people",
      "POST",
      { email: "not-valid" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid role", async () => {
    mockPersonCreate.mockRejectedValue(new Error('Invalid role "badRole"'));

    const req = createRequest(
      "http://localhost/api/admin/people",
      "POST",
      { name: { first: "A", last: "B" }, email: "a@b.com", roles: ["racer"] }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("INVALID_ROLE");
  });
});

describe("GET /api/admin/people/[personId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with person data", async () => {
    const mockPerson = { _id: "p1", name: { first: "John", last: "Doe" } };
    mockPersonGetById.mockResolvedValue(mockPerson);

    const req = createRequest(
      "http://localhost/api/admin/people/p1",
      "GET"
    );
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data._id).toBe("p1");
  });

  it("returns 404 when person not found", async () => {
    mockPersonGetById.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost/api/admin/people/nonexistent",
      "GET"
    );
    const res = await GET_BY_ID(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/admin/people/[personId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful update", async () => {
    const updated = { _id: "p1", name: { first: "Updated", last: "Name" } };
    mockPersonUpdate.mockResolvedValue(updated);

    const req = createRequest(
      "http://localhost/api/admin/people/p1",
      "PUT",
      { name: { first: "Updated", last: "Name" } }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name.first).toBe("Updated");
  });

  it("returns 404 when person not found", async () => {
    mockPersonUpdate.mockRejectedValue(
      new Error('Person with id "missing" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/people/missing",
      "PUT",
      { name: { first: "A", last: "B" } }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid input", async () => {
    const req = createRequest(
      "http://localhost/api/admin/people/p1",
      "PUT",
      { email: "not-an-email" }
    );
    const res = await UPDATE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/admin/people/[personId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockFindByIdAndDelete.mockResolvedValue({ _id: "p1" });

    const req = createRequest(
      "http://localhost/api/admin/people/p1",
      "DELETE"
    );
    const res = await DELETE_PERSON(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Person deleted successfully");
  });

  it("returns 404 when person not found", async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);

    const req = createRequest(
      "http://localhost/api/admin/people/missing",
      "DELETE"
    );
    const res = await DELETE_PERSON(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/admin/people/[personId]/roles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with updated person roles", async () => {
    const updated = { _id: "p1", roles: ["racer", "volunteer"] };
    mockPersonAssignRoles.mockResolvedValue(updated);

    const req = createRequest(
      "http://localhost/api/admin/people/p1/roles",
      "PUT",
      { roles: ["racer", "volunteer"] }
    );
    const res = await ASSIGN_ROLES(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.roles).toEqual(["racer", "volunteer"]);
  });

  it("returns 400 for empty roles array", async () => {
    const req = createRequest(
      "http://localhost/api/admin/people/p1/roles",
      "PUT",
      { roles: [] }
    );
    const res = await ASSIGN_ROLES(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when person not found", async () => {
    mockPersonAssignRoles.mockRejectedValue(
      new Error('Person with id "missing" not found')
    );

    const req = createRequest(
      "http://localhost/api/admin/people/missing/roles",
      "PUT",
      { roles: ["racer"] }
    );
    const res = await ASSIGN_ROLES(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/admin/people/[personId]/roles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 when role removed successfully", async () => {
    const updated = { _id: "p1", roles: ["volunteer"] };
    mockPersonRemoveRole.mockResolvedValue(updated);

    const req = createRequest(
      "http://localhost/api/admin/people/p1/roles",
      "DELETE",
      { role: "racer" }
    );
    const res = await REMOVE_ROLE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.roles).toEqual(["volunteer"]);
  });

  it("returns 400 when person does not have the role", async () => {
    mockPersonRemoveRole.mockRejectedValue(
      new Error('Person does not have role "mentor"')
    );

    const req = createRequest(
      "http://localhost/api/admin/people/p1/roles",
      "DELETE",
      { role: "mentor" }
    );
    const res = await REMOVE_ROLE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("ROLE_NOT_ASSIGNED");
  });

  it("returns 400 for invalid role value", async () => {
    const req = createRequest(
      "http://localhost/api/admin/people/p1/roles",
      "DELETE",
      { role: "invalidrole" }
    );
    const res = await REMOVE_ROLE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});
