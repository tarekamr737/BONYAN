import { apiRequest } from "../../../core/api/client";
import type { ProfileUpdate, UserProfile } from "../types";

export type LocalProfilePhoto = {
  file?: Blob;
  name: string;
  type: string;
  uri: string;
};

export function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/me");
}

export function updateMyProfile(update: ProfileUpdate): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/me", { body: update, method: "PATCH" });
}

export function deleteMyAccount(): Promise<void> {
  return apiRequest<void>("/api/v1/me", { method: "DELETE" });
}

export function uploadMyProfilePhoto(photo: LocalProfilePhoto): Promise<UserProfile> {
  const form = new FormData();
  const file = photo.file ?? ({ name: photo.name, type: photo.type, uri: photo.uri } as unknown as Blob);
  form.append("photo", file, photo.name);
  return apiRequest<UserProfile>("/api/v1/me/photo", { body: form, method: "PUT" });
}

export function deleteMyProfilePhoto(): Promise<void> {
  return apiRequest<void>("/api/v1/me/photo", { method: "DELETE" });
}

export const getAssessment = () => apiRequest<import("../types").AssessmentOverview>("/api/v1/me/assessment");
export const getProfileHistory = (offset = 0) => apiRequest<import("../types").HistoryEntry[]>(`/api/v1/me/history?offset=${offset}&limit=30`);
export const saveAssessment = (body: {request_id: string; source: "manual" | "inbody"; measurements?: import("../types").Measurements; inbody_scan_id?: string}) => apiRequest<import("../types").HistoryEntry>("/api/v1/me/assessments", {method: "POST", body});
