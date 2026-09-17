import { describe, expect, it } from "vitest";
import { getInBodyReviewState } from "../src/features/inbody/reviewState";
import type { InBodyScan } from "../src/features/inbody/types";

const scan = {
  id: "scan-1",
  status: "processing",
  filename: "report.pdf",
  content_type: "application/pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  confirmed_at: null,
  failure_code: null,
  failure_message: null,
  result: null,
} satisfies InBodyScan;

describe("Review Scan state", () => {
  it("never offers correction controls for a failed scan", () => {
    expect(getInBodyReviewState({ ...scan, status: "failed" })).toBe("failed");
    expect(getInBodyReviewState({ ...scan, status: "failed", result: { scan_date: null, measurements: [], review_flags: [] } })).toBe("failed");
  });

  it("distinguishes confirmed, reviewable, and pending scans", () => {
    expect(getInBodyReviewState({ ...scan, status: "confirmed" })).toBe("confirmed");
    expect(getInBodyReviewState({ ...scan, result: { scan_date: null, measurements: [], review_flags: [] } })).toBe("review");
    expect(getInBodyReviewState(scan)).toBe("pending");
    expect(getInBodyReviewState(undefined)).toBe("pending");
  });
});
