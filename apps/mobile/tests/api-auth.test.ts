import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "../src/core/api/client";
import { setSessionAccessToken } from "../src/core/auth/session";

afterEach(() => {
  setSessionAccessToken(null);
  vi.unstubAllGlobals();
});

describe("authenticated API client", () => {
  it("adds the current bearer token without accepting an owner ID", async () => {
    setSessionAccessToken("signed-access-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ scans: [] }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/v1/inbody/scans");

    const request = fetchMock.mock.calls[0];
    const options = request?.[1] as RequestInit;
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer signed-access-token",
    );
  });
});
