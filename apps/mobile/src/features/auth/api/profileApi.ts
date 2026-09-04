import { apiRequest } from "../../../core/api/client";
import type { ProfileUpdate, UserProfile } from "../types";

export function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/me");
}

export function updateMyProfile(update: ProfileUpdate): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/me", { body: update, method: "PATCH" });
}

export function deleteMyAccount(): Promise<void> {
  return apiRequest<void>("/api/v1/me", { method: "DELETE" });
}
