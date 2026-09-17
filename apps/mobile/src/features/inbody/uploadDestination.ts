import type { UploadResponse } from "./types";

export type InBodyUploadDestination =
  | { route: "progress" }
  | { route: "review"; scanId: string };

export function getInBodyUploadDestination(
  response: UploadResponse,
): InBodyUploadDestination {
  if (response.duplicate && response.scan.status === "confirmed") {
    return { route: "progress" };
  }
  return { route: "review", scanId: response.scan.id };
}
