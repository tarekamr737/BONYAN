import { apiRequest } from "../../core/api/client";
import type {
  CommunityFeedView,
  CommunityPostView,
  CreatePostPayload,
  ReactionKind,
  ReactionSummaryView,
  ReportReason,
} from "./types";

const communityPath = "/api/v1/community";

export function getCommunityFeed(cursor: string | null): Promise<CommunityFeedView> {
  const query = new URLSearchParams({ limit: "12" });
  if (cursor) query.set("cursor", cursor);
  return apiRequest<CommunityFeedView>(`${communityPath}/feed?${query.toString()}`);
}

export function createCommunityPost(payload: CreatePostPayload): Promise<CommunityPostView> {
  return apiRequest<CommunityPostView>(`${communityPath}/posts`, {
    method: "POST",
    body: payload,
  });
}

export function deleteCommunityPost(postId: string): Promise<void> {
  return apiRequest<void>(`${communityPath}/posts/${postId}`, { method: "DELETE" });
}

export function setPostReaction(
  postId: string,
  reaction: ReactionKind,
): Promise<ReactionSummaryView> {
  return apiRequest<ReactionSummaryView>(`${communityPath}/posts/${postId}/reactions`, {
    method: "POST",
    body: { reaction },
  });
}

export function removePostReaction(postId: string): Promise<ReactionSummaryView> {
  return apiRequest<ReactionSummaryView>(`${communityPath}/posts/${postId}/reactions`, {
    method: "DELETE",
  });
}

export function reportCommunityPost(postId: string, reason: ReportReason): Promise<void> {
  return apiRequest<void>(`${communityPath}/posts/${postId}/reports`, {
    method: "POST",
    body: { reason },
  });
}
