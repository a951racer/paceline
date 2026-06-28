/**
 * Unit tests for POST /api/auth/google
 */

import { POST } from "@/app/api/auth/google/route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/google", () => {
  it("returns 400 for missing token", async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 501 stub response for valid token", async () => {
    const req = createRequest({ token: "google-oauth-token" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data.code).toBe("NOT_IMPLEMENTED");
  });
});
