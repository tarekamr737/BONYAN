import { describe, expect, it } from "vitest";

import { validateApiUrl } from "../release-env.cjs";

describe("release API URL validation", () => {
  it("accepts a valid HTTPS production URL", () => {
    expect(validateApiUrl("https://api.bonyan.example/", { release: true })).toBe(
      "https://api.bonyan.example",
    );
  });

  it.each([undefined, "", "   "])("rejects a missing release URL", (value) => {
    expect(() => validateApiUrl(value, { release: true })).toThrow("required");
  });

  it.each(["http://localhost:8000", "https://localhost", "https://127.0.0.1"])(
    "rejects a release loopback URL: %s",
    (value) => {
      expect(() => validateApiUrl(value, { release: true })).toThrow();
    },
  );

  it("rejects non-HTTPS release URLs", () => {
    expect(() => validateApiUrl("http://api.bonyan.example", { release: true })).toThrow(
      "HTTPS",
    );
  });

  it("allows an intentional local development fallback", () => {
    expect(validateApiUrl(undefined, { release: false })).toBe("http://127.0.0.1:8000");
    expect(validateApiUrl("http://localhost:8080", { release: false })).toBe(
      "http://localhost:8080",
    );
  });
});
