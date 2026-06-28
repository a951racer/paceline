/**
 * Unit tests for POST /api/auth/apple
 */

import { POST } from "@/app/api/auth/apple/route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/apple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/apple", () => {
  it("returns 400 for missing code", async () => {
    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 501 stub response for valid code", async () => {
    const req = createRequest({ code: "apple-auth-code" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data.code).toBe("NOT_IMPLEMENTED");
  });
});
