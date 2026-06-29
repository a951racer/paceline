/**
 * Preservation Property Tests - Non-Admin Fetch Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests define the PRESERVATION CONTRACT for the adminFetch utility.
 * They ensure that existing behavior is not broken by the bugfix:
 *
 * 1. Missing token handling: adminFetch proceeds gracefully when no token is in localStorage
 * 2. Header merging: caller-provided headers are preserved alongside Authorization
 * 3. LeagueId handling: leagueId is appended correctly based on store state,
 *    existing query params are preserved, and no leagueId is added when store has none
 *
 * EXPECTED OUTCOME: Tests will FAIL until adminFetch is implemented (Task 3.1).
 * Once implemented, these tests MUST PASS to confirm preservation guarantees.
 */

import * as fc from "fast-check";
import { adminFetch } from "@/lib/admin-fetch";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

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

/** Generates a random admin API URL path */
const adminUrlArb = fc
  .record({
    resource: fc.constantFrom(...adminResources),
    subPath: fc.option(fc.stringMatching(/^[a-f0-9]{24}$/), { nil: undefined }),
  })
  .map(({ resource, subPath }) =>
    subPath ? `/api/admin/${resource}/${subPath}` : `/api/admin/${resource}`
  );

/** Generates a random admin URL with existing query parameters */
const adminUrlWithQueryArb = fc
  .record({
    base: adminUrlArb,
    hasExistingParams: fc.boolean(),
    paramKey: fc.stringMatching(/^[a-z]{3,10}$/),
    paramValue: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  })
  .map(({ base, hasExistingParams, paramKey, paramValue }) =>
    hasExistingParams ? `${base}?${paramKey}=${paramValue}` : base
  );

/** Generates arbitrary HTTP header name-value pairs (common headers) */
const headerNameArb = fc.constantFrom(
  "Content-Type",
  "Accept",
  "X-Custom-Header",
  "X-Request-Id",
  "Cache-Control"
);

const headerValueArb = fc.constantFrom(
  "application/json",
  "text/plain",
  "text/html",
  "multipart/form-data",
  "no-cache",
  "custom-value-123"
);

/** Generates an arbitrary set of caller-provided headers (1 to 4 headers) */
const callerHeadersArb = fc
  .array(fc.tuple(headerNameArb, headerValueArb), { minLength: 1, maxLength: 4 })
  .map((entries) => Object.fromEntries(entries) as Record<string, string>);

/** Generates a random leagueId (MongoDB-style ObjectId) */
const leagueIdArb = fc.stringMatching(/^[a-f0-9]{24}$/);

/** Generates arbitrary HTTP methods */
const httpMethodArb = fc.constantFrom("GET", "POST", "PUT", "DELETE");

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const MOCK_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function setupLocalStorage(token: string | null) {
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => {
        if (key === "accessToken") return token;
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
}

let capturedRequests: { url: string; init: RequestInit }[];

function setupFetchMock() {
  capturedRequests = [];
  globalThis.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      capturedRequests.push({ url, init: init || {} });
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  ) as jest.Mock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Preservation: Admin Fetch Graceful Missing Token Handling", () => {
  beforeEach(() => {
    setupLocalStorage(null); // No token in localStorage
    setupFetchMock();

    // Mock useLeagueStore with no active league
    jest.mock("@/hooks/use-league-store", () => ({
      useLeagueStore: {
        getState: () => ({ activeLeagueId: null }),
      },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("Property: adminFetch does not crash when no token exists in localStorage", async () => {
    await fc.assert(
      fc.asyncProperty(adminUrlArb, httpMethodArb, async (url, method) => {
        capturedRequests = [];

        // adminFetch should not throw when token is missing
        await expect(
          adminFetch(url, { method })
        ).resolves.not.toThrow();

        // A request should still be made (allows middleware 401 flow)
        expect(capturedRequests.length).toBe(1);
      }),
      { numRuns: 50 }
    );
  });

  it("Property: adminFetch does not include Authorization header when no token exists", async () => {
    await fc.assert(
      fc.asyncProperty(adminUrlArb, httpMethodArb, async (url, method) => {
        capturedRequests = [];

        await adminFetch(url, { method });

        const request = capturedRequests[0];
        const headers = new Headers(request.init.headers as HeadersInit);
        const authHeader = headers.get("authorization");

        // No token means no Authorization header
        expect(authHeader).toBeNull();
      }),
      { numRuns: 50 }
    );
  });
});

describe("Preservation: Header Merging - Caller Headers Are Preserved", () => {
  beforeEach(() => {
    setupLocalStorage(MOCK_TOKEN);
    setupFetchMock();

    jest.mock("@/hooks/use-league-store", () => ({
      useLeagueStore: {
        getState: () => ({ activeLeagueId: null }),
      },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("Property: adminFetch preserves ALL caller-provided headers alongside Authorization", async () => {
    await fc.assert(
      fc.asyncProperty(
        adminUrlArb,
        callerHeadersArb,
        httpMethodArb,
        async (url, callerHeaders, method) => {
          capturedRequests = [];

          await adminFetch(url, { method, headers: callerHeaders });

          expect(capturedRequests.length).toBe(1);

          const request = capturedRequests[0];
          const sentHeaders = new Headers(request.init.headers as HeadersInit);

          // All caller-provided headers must be present in the outgoing request
          for (const [key, value] of Object.entries(callerHeaders)) {
            expect(sentHeaders.get(key)).toBe(value);
          }

          // Authorization header must also be present (token exists)
          expect(sentHeaders.get("authorization")).toBe(
            `Bearer ${MOCK_TOKEN}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property: adminFetch does not overwrite caller-provided headers", async () => {
    await fc.assert(
      fc.asyncProperty(
        adminUrlArb,
        callerHeadersArb,
        async (url, callerHeaders) => {
          capturedRequests = [];

          await adminFetch(url, { method: "POST", headers: callerHeaders });

          const request = capturedRequests[0];
          const sentHeaders = new Headers(request.init.headers as HeadersInit);

          // Verify each caller header value is exactly what was provided
          for (const [key, value] of Object.entries(callerHeaders)) {
            expect(sentHeaders.get(key)).toBe(value);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Preservation: LeagueId Handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe("when activeLeagueId is set", () => {
    beforeEach(() => {
      setupLocalStorage(MOCK_TOKEN);
      setupFetchMock();
    });

    it("Property: leagueId param is appended to admin URLs when activeLeagueId is set", async () => {
      await fc.assert(
        fc.asyncProperty(
          adminUrlWithQueryArb,
          leagueIdArb,
          async (url, leagueId) => {
            capturedRequests = [];

            // Reset modules to allow re-mocking per iteration
            jest.resetModules();

            // Mock the store with a specific leagueId for this test case
            jest.mock("@/hooks/use-league-store", () => ({
              useLeagueStore: {
                getState: () => ({ activeLeagueId: leagueId }),
              },
            }));

            // Re-import to pick up new mock
            const { adminFetch: freshAdminFetch } = await import(
              "@/lib/admin-fetch"
            );

            await freshAdminFetch(url, { method: "GET" });

            expect(capturedRequests.length).toBe(1);

            const requestUrl = new URL(
              capturedRequests[0].url,
              "http://localhost"
            );
            expect(requestUrl.searchParams.get("leagueId")).toBe(leagueId);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("Property: existing query parameters in URL are preserved when leagueId is appended", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            resource: fc.constantFrom(...adminResources),
            paramKey: fc.stringMatching(/^[a-z]{3,10}$/),
            paramValue: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          }),
          leagueIdArb,
          async ({ resource, paramKey, paramValue }, leagueId) => {
            capturedRequests = [];

            // Reset modules to allow re-mocking per iteration
            jest.resetModules();

            const urlWithParam = `/api/admin/${resource}?${paramKey}=${paramValue}`;

            jest.mock("@/hooks/use-league-store", () => ({
              useLeagueStore: {
                getState: () => ({ activeLeagueId: leagueId }),
              },
            }));

            const { adminFetch: freshAdminFetch } = await import(
              "@/lib/admin-fetch"
            );

            await freshAdminFetch(urlWithParam, { method: "GET" });

            expect(capturedRequests.length).toBe(1);

            const requestUrl = new URL(
              capturedRequests[0].url,
              "http://localhost"
            );

            // Original param is preserved
            expect(requestUrl.searchParams.get(paramKey)).toBe(paramValue);
            // leagueId is also present
            expect(requestUrl.searchParams.get("leagueId")).toBe(leagueId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("when activeLeagueId is null", () => {
    beforeEach(() => {
      setupLocalStorage(MOCK_TOKEN);
      setupFetchMock();

      jest.mock("@/hooks/use-league-store", () => ({
        useLeagueStore: {
          getState: () => ({ activeLeagueId: null }),
        },
      }));
    });

    it("Property: NO leagueId param is added when activeLeagueId is null", async () => {
      await fc.assert(
        fc.asyncProperty(adminUrlWithQueryArb, async (url) => {
          capturedRequests = [];

          await adminFetch(url, { method: "GET" });

          expect(capturedRequests.length).toBe(1);

          const requestUrl = new URL(
            capturedRequests[0].url,
            "http://localhost"
          );

          // leagueId should NOT be present
          expect(requestUrl.searchParams.has("leagueId")).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it("Property: existing query parameters are preserved even when no leagueId is added", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            resource: fc.constantFrom(...adminResources),
            paramKey: fc.stringMatching(/^[a-z]{3,10}$/),
            paramValue: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          }),
          async ({ resource, paramKey, paramValue }) => {
            capturedRequests = [];

            const urlWithParam = `/api/admin/${resource}?${paramKey}=${paramValue}`;

            await adminFetch(urlWithParam, { method: "GET" });

            expect(capturedRequests.length).toBe(1);

            const requestUrl = new URL(
              capturedRequests[0].url,
              "http://localhost"
            );

            // Original param preserved
            expect(requestUrl.searchParams.get(paramKey)).toBe(paramValue);
            // No leagueId added
            expect(requestUrl.searchParams.has("leagueId")).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
