import type { InBodyScan } from "./types";

export type InBodyReviewState = "failed" | "confirmed" | "review" | "pending";

export function getInBodyReviewState(scan: InBodyScan | undefined): InBodyReviewState {
  if (scan?.status === "failed") return "failed";
  if (scan?.status === "confirmed") return "confirmed";
  if (scan?.result) return "review";
  return "pending";
}
