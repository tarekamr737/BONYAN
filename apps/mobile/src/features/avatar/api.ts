import { ApiError, parseApiErrorPayload } from "../../core/api/errors";
import { apiRequest, getApiBaseUrl } from "../../core/api/client";
import { getAccessToken } from "../../core/auth/session";
import { createSourcePhotoFile } from "./sourcePhotoFile";
import { sourcePhotoFetch } from "./sourcePhotoFetch";
import type {
  AvatarListView,
  AvatarMeasurementStatus,
  AvatarView,
  AvatarPresentation,
  CreateAvatarPayload,
  ManualBodyMeasurementsPayload,
  AvatarSourcePhotoView,
  LocalAvatarSourcePhoto,
} from "./types";

const avatarPath = "/api/v1/avatars";

export function listAvatars(): Promise<AvatarListView> {
  return apiRequest<AvatarListView>(avatarPath);
}

export function getAvatarMeasurementStatus(
  presentation: AvatarPresentation,
): Promise<AvatarMeasurementStatus> {
  return apiRequest<AvatarMeasurementStatus>(
    `${avatarPath}/measurement-status?presentation=${presentation}`,
  );
}

export function saveManualBodyMeasurements(
  payload: ManualBodyMeasurementsPayload,
): Promise<void> {
  return apiRequest<void>(`${avatarPath}/manual-measurements`, {
    method: "PUT",
    body: payload,
  });
}

export function createAvatar(payload: CreateAvatarPayload): Promise<AvatarView> {
  return apiRequest<AvatarView>(avatarPath, { method: "POST", body: payload });
}

export async function uploadAvatarSourcePhoto(
  photo: LocalAvatarSourcePhoto,
): Promise<AvatarSourcePhotoView> {
  const form = new FormData();
  form.append("photo", createSourcePhotoFile(photo), photo.name);
  const headers = new Headers({ Accept: "application/json" });
  const accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await sourcePhotoFetch(`${getApiBaseUrl()}${avatarPath}/source-photos`, {
    body: form,
    headers,
    method: "POST",
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : undefined;
    const details = parseApiErrorPayload(payload);
    throw new ApiError(response.status, details.code, details.message);
  }
  return (await response.json()) as AvatarSourcePhotoView;
}

export function deleteAvatarSourcePhoto(sourcePhotoId: string): Promise<void> {
  return apiRequest<void>(`${avatarPath}/source-photos/${sourcePhotoId}`, {
    method: "DELETE",
  });
}

export function approveAvatar(avatarId: string): Promise<AvatarView> {
  return apiRequest<AvatarView>(`${avatarPath}/${avatarId}/approve`, { method: "POST" });
}

export function rejectAvatar(avatarId: string): Promise<AvatarView> {
  return apiRequest<AvatarView>(`${avatarPath}/${avatarId}/reject`, { method: "POST" });
}

export function regenerateAvatar(avatarId: string): Promise<AvatarView> {
  return apiRequest<AvatarView>(`${avatarPath}/${avatarId}/regenerate`, {
    method: "POST",
  });
}

export function setAvatarCommunityUse(
  avatarId: string,
  enabled: boolean,
): Promise<AvatarView> {
  return apiRequest<AvatarView>(`${avatarPath}/${avatarId}/community-use`, {
    method: "PUT",
    body: { enabled },
  });
}

export function deleteAvatar(avatarId: string): Promise<void> {
  return apiRequest<void>(`${avatarPath}/${avatarId}`, { method: "DELETE" });
}
