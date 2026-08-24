import { describe, expect, it } from "vitest";

import { fallbackApiError, parseApiErrorPayload } from "../src/core/api/errors";

describe("parseApiErrorPayload", () => {
  it("returns a typed server error", () => {
    expect(
      parseApiErrorPayload({
        error: { code: "invalid_request", message: "Check the submitted data." },
      }),
    ).toEqual({ code: "invalid_request", message: "Check the submitted data." });
  });

  it("uses a safe fallback for malformed responses", () => {
    expect(parseApiErrorPayload({ detail: "internal stack trace" })).toEqual(
      fallbackApiError,
    );
  });
});
