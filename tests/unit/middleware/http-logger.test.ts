import { withLogging, logRequest } from "@/middleware/http-logger";
import { NextResponse } from "next/server";

describe("http-logger middleware", () => {

  describe("logRequest", () => {
    it("logs request without throwing", () => {
      const request = new Request("http://localhost/api/test", {
        method: "GET",
      });

      expect(() => {
        logRequest(request, 200, new Headers());
      }).not.toThrow();
    });

    it("executes without errors for various HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        const request = new Request("http://localhost/api/standings", {
          method,
        });

        expect(() => {
          logRequest(request, 200, new Headers({ "content-length": "42" }));
        }).not.toThrow();
      }
    });
  });

  describe("withLogging", () => {
    it("wraps a handler and still returns the expected response", async () => {
      const handler = async () => NextResponse.json({ data: "test" });
      const wrapped = withLogging(handler);

      const request = new Request("http://localhost/api/test");
      const response = await wrapped(request);

      // Response should still be valid
      expect(response.status).toBe(200);
    });

    it("adds Server-Timing header in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const handler = async () => NextResponse.json({ data: "test" });
      const wrapped = withLogging(handler);

      const request = new Request("http://localhost/api/test");
      const response = await wrapped(request);

      expect(response.headers.get("Server-Timing")).toMatch(/total;dur=\d+/);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
