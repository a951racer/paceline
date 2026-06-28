/**
 * Unit tests for POST /api/auth/forgot-password
 */

import { POST } from "@/app/api/auth/forgot-password/route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 for invalid email", async () => {
    const req = createRequest({ email: "not-valid" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with message for valid email", async () => {
    const req = createRequest({ email: "user@example.com" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain("password reset link");
  });
});
