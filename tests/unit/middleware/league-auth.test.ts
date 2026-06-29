import { NextResponse } from "next/server";
import { withLeagueAuth } from "@/middleware/league-auth";
import type { LeagueAuthContext } from "@/middleware/league-auth";
import { generateAccessToken } from "@/lib/auth/jwt";
import type { JwtPayload } from "@/lib/auth/jwt";

// Set JWT_SECRET for token generation/verification in tests
process.env.JWT_SECRET = "test-secret-for-league-auth-middleware";
process.env.JWT_ACCESS_TOKEN_EXPIRY = "15m";

function createRequest(options: {
  token?: string;
  leagueIdQuery?: string;
  leagueIdHeader?: string;
  url?: string;
}): Request {
  const { token, leagueIdQuery, leagueIdHeader, url } = options;
  const baseUrl = url || "http://localhost/api/admin/seasons";
  const urlObj = new URL(baseUrl);
  if (leagueIdQuery) {
    urlObj.searchParams.set("leagueId", leagueIdQuery);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (leagueIdHeader) {
    headers["X-League-Id"] = leagueIdHeader;
  }

  return new Request(urlObj.toString(), { headers });
}

describe("league-auth middleware (withLeagueAuth)", () => {
  const superAdminPayload: JwtPayload = {
    userId: "super-admin-1",
    email: "super@example.com",
    roles: ["super_administrator"],
    adminScope: { type: "super" },
  };

  const leagueAdminPayload: JwtPayload = {
    userId: "league-admin-1",
    email: "leagueadmin@example.com",
    roles: ["league_administrator"],
    adminScope: { type: "league", leagueIds: ["league-a", "league-b"] },
  };

  const noScopePayload: JwtPayload = {
    userId: "user-1",
    email: "user@example.com",
    roles: ["racer"],
  };

  const adminNoScopePayload: JwtPayload = {
    userId: "admin-1",
    email: "admin@example.com",
    roles: ["administrator"],
  };

  describe("authentication checks", () => {
    it("returns 401 when no Authorization header is present", async () => {
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(
        createRequest({ leagueIdQuery: "league-a" })
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(body.message).toBe("Authentication required");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", async () => {
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(
        createRequest({ token: "invalid-token", leagueIdQuery: "league-a" })
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("leagueId extraction", () => {
    it("returns 400 LEAGUE_REQUIRED when no leagueId is provided", async () => {
      const token = generateAccessToken(superAdminPayload);
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(createRequest({ token }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("LEAGUE_REQUIRED");
      expect(body.message).toBe("leagueId parameter is missing from request");
      expect(handler).not.toHaveBeenCalled();
    });

    it("extracts leagueId from query parameter", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdQuery: "league-xyz" }));

      expect(receivedContext).toBeDefined();
      expect(receivedContext!.leagueId).toBe("league-xyz");
    });

    it("extracts leagueId from X-League-Id header when query param is absent", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdHeader: "league-from-header" }));

      expect(receivedContext).toBeDefined();
      expect(receivedContext!.leagueId).toBe("league-from-header");
    });

    it("prefers query param over X-League-Id header", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(
        createRequest({
          token,
          leagueIdQuery: "from-query",
          leagueIdHeader: "from-header",
        })
      );

      expect(receivedContext).toBeDefined();
      expect(receivedContext!.leagueId).toBe("from-query");
    });
  });

  describe("Super_Admin access", () => {
    it("allows Super_Admin to access any league", async () => {
      const token = generateAccessToken(superAdminPayload);
      const handler = async (_req: Request, _ctx: LeagueAuthContext) =>
        NextResponse.json({ ok: true });

      const wrapped = withLeagueAuth(handler);
      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "any-league-id" })
      );

      expect(response.status).toBe(200);
    });

    it("sets isSuperAdmin true and isLeagueAdmin false for Super_Admin", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdQuery: "league-a" }));

      expect(receivedContext!.isSuperAdmin).toBe(true);
      expect(receivedContext!.isLeagueAdmin).toBe(false);
    });
  });

  describe("League_Admin access", () => {
    it("allows League_Admin to access an assigned league", async () => {
      const token = generateAccessToken(leagueAdminPayload);
      const handler = async (_req: Request, _ctx: LeagueAuthContext) =>
        NextResponse.json({ ok: true });

      const wrapped = withLeagueAuth(handler);
      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "league-a" })
      );

      expect(response.status).toBe(200);
    });

    it("allows League_Admin to access another assigned league", async () => {
      const token = generateAccessToken(leagueAdminPayload);
      const handler = async (_req: Request, _ctx: LeagueAuthContext) =>
        NextResponse.json({ ok: true });

      const wrapped = withLeagueAuth(handler);
      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "league-b" })
      );

      expect(response.status).toBe(200);
    });

    it("returns 403 LEAGUE_ACCESS_DENIED for unassigned league", async () => {
      const token = generateAccessToken(leagueAdminPayload);
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "league-c" })
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("LEAGUE_ACCESS_DENIED");
      expect(body.message).toBe("You do not have access to this league");
      expect(handler).not.toHaveBeenCalled();
    });

    it("sets isLeagueAdmin true and isSuperAdmin false for League_Admin", async () => {
      const token = generateAccessToken(leagueAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdQuery: "league-a" }));

      expect(receivedContext!.isSuperAdmin).toBe(false);
      expect(receivedContext!.isLeagueAdmin).toBe(true);
      expect(receivedContext!.adminLeagueIds).toEqual(["league-a", "league-b"]);
    });
  });

  describe("no adminScope", () => {
    it("returns 403 when user has no adminScope", async () => {
      const token = generateAccessToken(noScopePayload);
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "league-a" })
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("LEAGUE_ACCESS_DENIED");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when administrator has no adminScope", async () => {
      const token = generateAccessToken(adminNoScopePayload);
      const handler = jest.fn();
      const wrapped = withLeagueAuth(handler);

      const response = await wrapped(
        createRequest({ token, leagueIdQuery: "league-a" })
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("LEAGUE_ACCESS_DENIED");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("context passing", () => {
    it("passes userId, email, and roles in context", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdQuery: "league-a" }));

      expect(receivedContext!.userId).toBe("super-admin-1");
      expect(receivedContext!.email).toBe("super@example.com");
      expect(receivedContext!.roles).toEqual(["super_administrator"]);
    });

    it("passes the original request to the handler", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedRequest: Request | undefined;

      const handler = async (req: Request, _ctx: LeagueAuthContext) => {
        receivedRequest = req;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      const request = createRequest({ token, leagueIdQuery: "league-a" });
      await wrapped(request);

      expect(receivedRequest).toBe(request);
    });

    it("provides adminLeagueIds as empty array for Super_Admin", async () => {
      const token = generateAccessToken(superAdminPayload);
      let receivedContext: LeagueAuthContext | undefined;

      const handler = async (_req: Request, ctx: LeagueAuthContext) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      };

      const wrapped = withLeagueAuth(handler);
      await wrapped(createRequest({ token, leagueIdQuery: "league-a" }));

      expect(receivedContext!.adminLeagueIds).toEqual([]);
    });
  });
});
