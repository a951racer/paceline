/**
 * Unit tests for POST /api/auth/refresh
 */

import { POST } from "@/app/api/auth/refresh/route";
import { AuthError } from "@/lib/auth";

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth/jwt");
  return {
    ...actual,
    refreshTokens: jest.fn(),
    AuthError: actual.AuthError,
  };
});

import { refreshTokens } from "@/lib/auth";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for missing refresh token", async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for expired refresh token", async () => {
    (refreshTokens as jest.Mock).mockImplementation(() => {
      throw new AuthError("Token has expired", "TOKEN_EXPIRED");
    });

    const req = createRequest({ refreshToken: "expired-token" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("TOKEN_EXPIRED");
  });

  it("returns 401 for invalid refresh token", async () => {
    (refreshTokens as jest.Mock).mockImplementation(() => {
      throw new AuthError("Invalid token", "INVALID_TOKEN");
    });

    const req = createRequest({ refreshToken: "invalid-token" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_TOKEN");
  });

  it("returns 200 with new token pair on valid refresh", async () => {
    (refreshTokens as jest.Mock).mockReturnValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const req = createRequest({ refreshToken: "valid-refresh-token" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe("new-access-token");
    expect(data.refreshToken).toBe("new-refresh-token");
  });
});
