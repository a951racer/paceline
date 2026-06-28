/**
 * Unit tests for POST /api/auth/login
 */

import { POST } from "@/app/api/auth/login/route";

// Mock dependencies
jest.mock("@/lib/db/mongodb", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

const mockFindOne = jest.fn();
jest.mock("@/models/person.model", () => ({
  PersonModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

jest.mock("@/lib/auth", () => ({
  comparePassword: jest.fn(),
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  }),
}));

import { comparePassword } from "@/lib/auth";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid input (missing email)", async () => {
    const req = createRequest({ password: "secret123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid input (invalid email format)", async () => {
    const req = createRequest({ email: "not-an-email", password: "secret123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when person not found", async () => {
    mockFindOne.mockResolvedValue(null);

    const req = createRequest({
      email: "notfound@example.com",
      password: "secret123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 when person has no passwordHash", async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => "user-1" },
      email: "user@example.com",
      passwordHash: null,
      roles: ["racer"],
      name: { first: "John", last: "Doe" },
    });

    const req = createRequest({
      email: "user@example.com",
      password: "secret123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 when password does not match", async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => "user-1" },
      email: "user@example.com",
      passwordHash: "hashed-password",
      roles: ["racer"],
      name: { first: "John", last: "Doe" },
    });
    (comparePassword as jest.Mock).mockResolvedValue(false);

    const req = createRequest({
      email: "user@example.com",
      password: "wrongpassword",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 200 with token pair on successful login", async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => "user-1" },
      email: "user@example.com",
      passwordHash: "hashed-password",
      roles: ["racer"],
      name: { first: "John", last: "Doe" },
    });
    (comparePassword as jest.Mock).mockResolvedValue(true);

    const req = createRequest({
      email: "user@example.com",
      password: "correctpassword",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe("mock-access-token");
    expect(data.refreshToken).toBe("mock-refresh-token");
    expect(data.user.id).toBe("user-1");
    expect(data.user.email).toBe("user@example.com");
  });
});
