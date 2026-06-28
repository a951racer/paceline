/**
 * Unit tests for POST /api/auth/register
 */

import { POST } from "@/app/api/auth/register/route";

// Mock dependencies
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/models/person.model", () => ({
  PersonModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

jest.mock("@/lib/auth", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  }),
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for missing required fields", async () => {
    const req = createRequest({ email: "test@example.com" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for short password", async () => {
    const req = createRequest({
      name: { first: "John", last: "Doe" },
      email: "test@example.com",
      password: "short",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 when email already exists", async () => {
    mockFindOne.mockResolvedValue({ email: "existing@example.com" });

    const req = createRequest({
      name: { first: "John", last: "Doe" },
      email: "existing@example.com",
      password: "validpassword123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("returns 201 with token pair on successful registration", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      _id: { toString: () => "new-user-1" },
      name: { first: "John", last: "Doe" },
      email: "new@example.com",
      roles: [],
    });

    const req = createRequest({
      name: { first: "John", last: "Doe" },
      email: "new@example.com",
      password: "validpassword123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.accessToken).toBe("mock-access-token");
    expect(data.refreshToken).toBe("mock-refresh-token");
    expect(data.user.id).toBe("new-user-1");
    expect(data.user.name.first).toBe("John");
  });

  it("stores email in lowercase", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      _id: { toString: () => "new-user-2" },
      name: { first: "Jane", last: "Smith" },
      email: "test@example.com",
      roles: [],
    });

    const req = createRequest({
      name: { first: "Jane", last: "Smith" },
      email: "Test@Example.COM",
      password: "validpassword123",
    });
    await POST(req);

    expect(mockFindOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
  });
});
