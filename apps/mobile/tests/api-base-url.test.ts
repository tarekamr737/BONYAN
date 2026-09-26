import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "../src/core/api/baseUrl";

describe("API base URL", () => {
  it("routes Android emulator loopback URLs to the host", () => {
    expect(resolveApiBaseUrl(undefined, "android")).toBe("http://10.0.2.2:8000");
    expect(resolveApiBaseUrl("http://localhost:8000/", "android")).toBe("http://10.0.2.2:8000");
  });

  it("preserves a configured network address for a physical device", () => {
    expect(resolveApiBaseUrl("http://192.168.1.5:8000/", "android")).toBe("http://192.168.1.5:8000");
  });

  it("keeps loopback for the web and iOS simulator", () => {
    expect(resolveApiBaseUrl(undefined, "web")).toBe("http://127.0.0.1:8000");
    expect(resolveApiBaseUrl("http://localhost:8000/", "ios")).toBe("http://localhost:8000");
  });
});
