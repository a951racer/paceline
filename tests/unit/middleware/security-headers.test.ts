import { NextResponse } from "next/server";
import {
  applySecurityHeaders,
  withSecurityHeaders,
  getSecurityHeaders,
} from "@/middleware/security-headers";

describe("security-headers middleware", () => {
  describe("getSecurityHeaders", () => {
    it("returns an object with expected security headers", () => {
      const headers = getSecurityHeaders();

      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-DNS-Prefetch-Control"]).toBe("off");
      expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
      expect(headers["X-XSS-Protection"]).toBe("0");
      expect(headers["Referrer-Policy"]).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(headers["Strict-Transport-Security"]).toBe(
        "max-age=15552000; includeSubDomains"
      );
      expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    });

    it("returns a copy that does not mutate the original", () => {
      const headers1 = getSecurityHeaders();
      headers1["X-Custom"] = "test";
      const headers2 = getSecurityHeaders();
      expect(headers2["X-Custom"]).toBeUndefined();
    });
  });

  describe("applySecurityHeaders", () => {
    it("sets all security headers on a NextResponse", () => {
      const response = NextResponse.json({ ok: true });
      const result = applySecurityHeaders(response);

      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(result.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(result.headers.get("Strict-Transport-Security")).toBe(
        "max-age=15552000; includeSubDomains"
      );
    });

    it("removes X-Powered-By header", () => {
      const response = NextResponse.json({ ok: true });
      response.headers.set("X-Powered-By", "Next.js");
      const result = applySecurityHeaders(response);
      expect(result.headers.has("X-Powered-By")).toBe(false);
    });
  });

  describe("withSecurityHeaders", () => {
    it("wraps a handler and applies security headers to its response", async () => {
      const handler = async () => NextResponse.json({ data: "test" });
      const wrapped = withSecurityHeaders(handler);

      const request = new Request("http://localhost/api/test");
      const response = await wrapped(request);

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");

      const body = await response.json();
      expect(body.data).toBe("test");
    });
  });
});
