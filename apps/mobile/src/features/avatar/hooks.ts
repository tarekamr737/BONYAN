import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveAvatar,
  createAvatar,
  deleteAvatar,
  listAvatars,
  regenerateAvatar,
  rejectAvatar,
  setAvatarCommunityUse,
} from "./api";
import type { AvatarListView, AvatarView, CreateAvatarPayload } from "./types";

export const avatarQueryKey = ["avatars"] as const;

export function useAvatars() {
  return useQuery({ queryKey: avatarQueryKey, queryFn: listAvatars });
}

export function useAvatarMutations() {
  const queryClient = useQueryClient();

  function storeAvatar(avatar: AvatarView) {
    queryClient.setQueryData<AvatarListView>(avatarQueryKey, (current) => ({
      items: [
        avatar,
        ...(current?.items.filter((candidate) => candidate.id !== avatar.id) ?? []),
      ],
    }));
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateAvatarPayload) => createAvatar(payload),
    onSuccess: storeAvatar,
  });
  const approveMutation = useMutation({
    mutationFn: approveAvatar,
    onSuccess: storeAvatar,
  });
  const rejectMutation = useMutation({
    mutationFn: rejectAvatar,
    onSuccess: storeAvatar,
  });
  const regenerateMutation = useMutation({
    mutationFn: regenerateAvatar,
    onSuccess: storeAvatar,
  });
  const communityUseMutation = useMutation({
    mutationFn: ({ avatarId, enabled }: { avatarId: string; enabled: boolean }) =>
      setAvatarCommunityUse(avatarId, enabled),
    onSuccess: storeAvatar,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: (_, avatarId) => {
      queryClient.setQueryData<AvatarListView>(avatarQueryKey, (current) => ({
        items: current?.items.filter((avatar) => avatar.id !== avatarId) ?? [],
      }));
    },
  });

  return {
    approveMutation,
    communityUseMutation,
    createMutation,
    deleteMutation,
    regenerateMutation,
    rejectMutation,
  };
}
