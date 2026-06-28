/**
 * Unit tests for POST /api/auth/reset-password
 */

import { POST } from "@/app/api/auth/reset-password/route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  it("returns 400 for missing token", async () => {
    const req = createRequest({ password: "newpassword123" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for short password", async () => {
    const req = createRequest({ token: "some-token", password: "short" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with success message for valid input", async () => {
    const req = createRequest({
      token: "valid-reset-token",
      password: "newstrongpassword123",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain("reset successfully");
  });
});
