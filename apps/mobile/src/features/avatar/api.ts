import { apiRequest } from "../../core/api/client";
import type {
  AvatarListView,
  AvatarMeasurementStatus,
  AvatarView,
  AvatarPresentation,
  CreateAvatarPayload,
  ManualBodyMeasurementsPayload,
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
