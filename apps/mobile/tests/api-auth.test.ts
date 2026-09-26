import { afterEach, describe, expect, it, vi } from "vitest";


import { apiRequest } from "../src/core/api/client";
import { setSessionAccessToken } from "../src/core/auth/session";

afterEach(() => {
  setSessionAccessToken(null);
  vi.unstubAllGlobals();
});

describe("authenticated API client", () => {
  it("shows a safe connection error when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to connect to /127.0.0.1:8000")));
    await expect(apiRequest("/api/v1/auth/login")).rejects.toMatchObject({code: "network_unavailable"});
  });

  it("times out a stalled request and preserves the session", async () => {
    setSessionAccessToken("current-token");
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    await expect(apiRequest("/api/v1/me", {timeoutMs: 5})).rejects.toMatchObject({code: "request_timeout"});
  });
  it("does not clear a newer session for an old request's unauthorized response", async () => {
    setSessionAccessToken("old-token");
    vi.stubGlobal("fetch", vi.fn(async () => {
      setSessionAccessToken("new-token");
      return new Response("{}", {status: 401, headers: {"Content-Type": "application/json"}});
    }));
    await expect(apiRequest("/api/v1/me")).rejects.toMatchObject({status: 401});
    const { getAccessToken } = await import("../src/core/auth/session");
    expect(getAccessToken()).toBe("new-token");
  });
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
    expect(request?.[0]).toBe("http://10.0.2.2:8000/api/v1/inbody/scans");
    const options = request?.[1] as RequestInit;
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer signed-access-token",
    );
  });
});
