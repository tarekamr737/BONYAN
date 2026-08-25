import { apiRequest } from "../../core/api/client";
import type {
  AvatarListView,
  AvatarMeasurementStatus,
  AvatarView,
  CreateAvatarPayload,
} from "./types";

const avatarPath = "/api/v1/avatars";

export function listAvatars(): Promise<AvatarListView> {
  return apiRequest<AvatarListView>(avatarPath);
}

export function getAvatarMeasurementStatus(): Promise<AvatarMeasurementStatus> {
  return apiRequest<AvatarMeasurementStatus>(`${avatarPath}/measurement-status`);
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
