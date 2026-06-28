import { NextResponse } from "next/server";
import {
  withRateLimit,
  getClientIp,
  rateLimitStore,
} from "@/middleware/rate-limit";

describe("rate-limit middleware", () => {
  beforeEach(() => {
    rateLimitStore.reset();
  });

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
      });
      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("extracts IP from x-real-ip header", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-real-ip": "5.6.7.8" },
      });
      expect(getClientIp(request)).toBe("5.6.7.8");
    });

    it("returns 'unknown' when no IP headers present", () => {
      const request = new Request("http://localhost/api/test");
      expect(getClientIp(request)).toBe("unknown");
    });

    it("prefers x-forwarded-for over x-real-ip", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "1.2.3.4",
          "x-real-ip": "5.6.7.8",
        },
      });
      expect(getClientIp(request)).toBe("1.2.3.4");
    });
  });

  describe("withRateLimit (public)", () => {
    it("allows requests within the limit", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = withRateLimit({ type: "public" })(handler);

      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "10.0.0.1" },
      });

      const response = await wrapped(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("99");
    });

    it("returns 429 when rate limit is exceeded", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = withRateLimit({ type: "public" })(handler);

      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "10.0.0.2" },
      });

      // Exhaust the rate limit (default max=100)
      for (let i = 0; i < 100; i++) {
        await wrapped(request);
      }

      // Next request should be rate limited
      const response = await wrapped(request);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(response.headers.has("Retry-After")).toBe(true);
    });

    it("rate limits different IPs independently", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = withRateLimit({ type: "public" })(handler);

      const request1 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "10.0.0.3" },
      });
      const request2 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "10.0.0.4" },
      });

      // Exhaust IP 1's limit
      for (let i = 0; i < 100; i++) {
        await wrapped(request1);
      }

      // IP 2 should still be allowed
      const response = await wrapped(request2);
      expect(response.status).toBe(200);
    });
  });

  describe("withRateLimit (admin)", () => {
    it("rate limits per-user when getUserId is provided", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = withRateLimit({
        type: "admin",
        getUserId: () => "user-123",
      })(handler);

      const request = new Request("http://localhost/api/admin/test", {
        headers: { "x-forwarded-for": "10.0.0.5" },
      });

      const response = await wrapped(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("200");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("199");
    });

    it("falls back to per-IP when getUserId returns null", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = withRateLimit({
        type: "admin",
        getUserId: () => null,
      })(handler);

      const request = new Request("http://localhost/api/admin/test", {
        headers: { "x-forwarded-for": "10.0.0.6" },
      });

      const response = await wrapped(request);
      expect(response.status).toBe(200);
      // Uses admin limits but keyed by IP
      expect(response.headers.get("X-RateLimit-Limit")).toBe("200");
    });
  });
});
