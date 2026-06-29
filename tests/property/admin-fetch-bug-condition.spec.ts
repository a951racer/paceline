/**
 * Bug Condition Exploration Test - Admin Fetch Missing Authorization Header
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 *
 * This test encodes the EXPECTED behavior after the fix:
 * - adminFetch automatically attaches Authorization: Bearer <token> header
 * - For all admin API URLs with a valid token in localStorage, the outgoing
 *   request includes the Authorization header
 *
 * Bug Condition from design:
 *   input.url.startsWith("/api/admin/") AND
 *   input.localStorage.getItem("accessToken") != null AND
 *   input.headers.get("authorization") = null
 *
 * EXPECTED OUTCOME on UNFIXED code: Test FAILS (import error because adminFetch
 * does not exist yet). This confirms the bug exists — there is no utility to
 * attach the Authorization header to admin fetch calls.
 */

import * as fc from "fast-check";
import { adminFetch } from "@/lib/admin-fetch";

// Admin resource paths that mirror real admin pages
const adminResources = [
  "awards",
  "races",
  "people",
  "seasons",
  "competitions",
  "organizations",
  "enrollments",
  "leagues",
  "branding",
  "results",
  "achievements",
  "nominations",
] as const;

// HTTP methods used by admin pages
const httpMethods = ["GET", "POST", "PUT", "DELETE"] as const;

// Arbitrary: generates a random admin API URL path
const adminUrlArb = fc
  .record({
    resource: fc.constantFrom(...adminResources),
    subPath: fc.option(
      fc.stringMatching(/^[a-f0-9]{24}$/),
      { nil: undefined }
    ),
  })
  .map(({ resource, subPath }) =>
    subPath
      ? `/api/admin/${resource}/${subPath}`
      : `/api/admin/${resource}`
  );

// Arbitrary: generates random RequestInit options
const requestInitArb = fc
  .record({
    method: fc.constantFrom(...httpMethods),
    hasBody: fc.boolean(),
    hasContentType: fc.boolean(),
    hasCustomHeader: fc.boolean(),
  })
  .map(({ method, hasBody, hasContentType, hasCustomHeader }) => {
    const options: RequestInit = { method };
    const headers: Record<string, string> = {};

    if (hasContentType) {
      headers["Content-Type"] = "application/json";
    }
    if (hasCustomHeader) {
      headers["X-Custom-Header"] = "test-value";
    }
    if (Object.keys(headers).length > 0) {
      options.headers = headers;
    }
    if (hasBody && method !== "GET") {
      options.body = JSON.stringify({ test: "data" });
    }

    return options;
  });

describe("Bug Condition: Admin Fetch Missing Authorization Header", () => {
  const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  let capturedRequests: { url: string; init: RequestInit }[];

  beforeEach(() => {
    capturedRequests = [];

    // Mock localStorage to return a valid token
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => {
          if (key === "accessToken") return MOCK_TOKEN;
          return null;
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    // Mock global fetch to capture outgoing requests
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      capturedRequests.push({ url, init: init || {} });
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Property 1: adminFetch always includes Authorization header for admin URLs when token exists in localStorage", async () => {
    await fc.assert(
      fc.asyncProperty(adminUrlArb, requestInitArb, async (url, options) => {
        // Reset captured requests for each generated input
        capturedRequests = [];

        // Call adminFetch with the generated URL and options
        await adminFetch(url, options);

        // Verify request was made
        expect(capturedRequests.length).toBeGreaterThan(0);

        const request = capturedRequests[0];

        // Extract the Authorization header from the captured request
        const headers = new Headers(request.init.headers as HeadersInit);
        const authHeader = headers.get("authorization");

        // Property: Authorization header MUST be present and contain the Bearer token
        expect(authHeader).toBe(`Bearer ${MOCK_TOKEN}`);
      }),
      { numRuns: 100 }
    );
  });
});
