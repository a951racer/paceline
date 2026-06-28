import { NextResponse } from "next/server";
import { withAuth, withAdmin } from "@/middleware/auth";
import type { AuthContext } from "@/middleware/auth";
import { generateAccessToken } from "@/lib/auth/jwt";
import type { JwtPayload } from "@/lib/auth/jwt";

// Set JWT_SECRET and ACCESS_TOKEN_EXPIRY for token generation/verification in tests
process.env.JWT_SECRET = "test-secret-for-auth-middleware";
process.env.JWT_ACCESS_TOKEN_EXPIRY = "15m";

function createRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/test", { headers });
}

function createRequestWithHeader(headerValue: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: headerValue },
  });
}

describe("auth middleware", () => {
  const racerPayload: JwtPayload = {
    userId: "user-123",
    email: "racer@example.com",
    roles: ["racer"],
  };

  const adminPayload: JwtPayload = {
    userId: "admin-456",
    email: "admin@example.com",
    roles: ["administrator"],
  };

  const multiRolePayload: JwtPayload = {
    userId: "multi-789",
    email: "multi@example.com",
    roles: ["racer", "administrator"],
  };

  describe("withAuth", () => {
    it("returns 401 when no Authorization header is present", async () => {
      const handler = jest.fn();
      const wrapped = withAuth(handler);

      const response = await wrapped(createRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(body.message).toBe("Authentication required");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header is malformed", async () => {
      const handler = jest.fn();
      const wrapped = withAuth(handler);

      const response = await wrapped(createRequestWithHeader("Basic abc123"));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", async () => {
      const handler = jest.fn();
      const wrapped = withAuth(handler);

      const response = await wrapped(createRequest("invalid-token"));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when token is expired", async () => {
      // Generate a token that expires in 1 second
      process.env.JWT_ACCESS_TOKEN_EXPIRY = "1s";
      const token = generateAccessToken(racerPayload);
      process.env.JWT_ACCESS_TOKEN_EXPIRY = "15m";

      const handler = jest.fn();
      const wrapped = withAuth(handler);

      // Wait for the token to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("passes decoded user context to handler on valid token", async () => {
      const token = generateAccessToken(racerPayload);
      let receivedContext: AuthContext | undefined;

      const handler = async (_req: Request, ctx: AuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withAuth(handler);
      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(200);
      expect(receivedContext).toBeDefined();
      expect(receivedContext!.userId).toBe("user-123");
      expect(receivedContext!.email).toBe("racer@example.com");
      expect(receivedContext!.roles).toEqual(["racer"]);
    });

    it("passes the original request to the handler", async () => {
      const token = generateAccessToken(racerPayload);
      let receivedRequest: Request | undefined;

      const handler = async (req: Request, _ctx: AuthContext) => {
        receivedRequest = req;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withAuth(handler);
      const request = createRequest(token);
      await wrapped(request);

      expect(receivedRequest).toBe(request);
    });

    it("allows any authenticated user regardless of role", async () => {
      const token = generateAccessToken(multiRolePayload);
      const handler = async (_req: Request, _ctx: AuthContext) =>
        NextResponse.json({ ok: true });

      const wrapped = withAuth(handler);
      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(200);
    });
  });

  describe("withAdmin", () => {
    it("returns 401 when no Authorization header is present", async () => {
      const handler = jest.fn();
      const wrapped = withAdmin(handler);

      const response = await wrapped(createRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", async () => {
      const handler = jest.fn();
      const wrapped = withAdmin(handler);

      const response = await wrapped(createRequest("bad-token"));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when user does not have administrator role", async () => {
      const token = generateAccessToken(racerPayload);
      const handler = jest.fn();
      const wrapped = withAdmin(handler);

      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe("Insufficient permissions");
      expect(handler).not.toHaveBeenCalled();
    });

    it("passes decoded admin context to handler on valid admin token", async () => {
      const token = generateAccessToken(adminPayload);
      let receivedContext: AuthContext | undefined;

      const handler = async (_req: Request, ctx: AuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withAdmin(handler);
      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(200);
      expect(receivedContext).toBeDefined();
      expect(receivedContext!.userId).toBe("admin-456");
      expect(receivedContext!.email).toBe("admin@example.com");
      expect(receivedContext!.roles).toEqual(["administrator"]);
    });

    it("allows users with administrator role among multiple roles", async () => {
      const token = generateAccessToken(multiRolePayload);
      let receivedContext: AuthContext | undefined;

      const handler = async (_req: Request, ctx: AuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withAdmin(handler);
      const response = await wrapped(createRequest(token));

      expect(response.status).toBe(200);
      expect(receivedContext!.roles).toEqual(["racer", "administrator"]);
    });

    it("returns 401 when Authorization header has no Bearer prefix", async () => {
      const token = generateAccessToken(adminPayload);
      const handler = jest.fn();
      const wrapped = withAdmin(handler);

      const response = await wrapped(createRequestWithHeader(token));

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
