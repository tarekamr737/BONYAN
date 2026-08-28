import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createCommunityPost,
  deleteCommunityPost,
  getCommunityFeed,
  removePostReaction,
  reportCommunityPost,
  setPostReaction,
} from "./api";
import { optimisticReaction } from "./logic";
import type {
  CommunityFeedView,
  CommunityPostView,
  CreatePostPayload,
  ReactionKind,
  ReportReason,
} from "./types";

export const communityFeedQueryKey = ["community", "feed"] as const;
type FeedData = InfiniteData<CommunityFeedView, string | null>;

export function useCommunityFeed() {
  return useInfiniteQuery({
    queryKey: communityFeedQueryKey,
    queryFn: ({ pageParam }) => getCommunityFeed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useCommunityMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => createCommunityPost(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityFeedQueryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommunityPost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: communityFeedQueryKey });
      const previous = queryClient.getQueryData<FeedData>(communityFeedQueryKey);
      queryClient.setQueryData<FeedData>(communityFeedQueryKey, (current) =>
        mapFeed(current, (post) => (post.id === postId ? null : post)),
      );
      return { previous };
    },
    onError: (_error, _postId, context) => {
      if (context?.previous) queryClient.setQueryData(communityFeedQueryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityFeedQueryKey }),
  });

  const reactionMutation = useMutation({
    mutationFn: ({
      postId,
      reaction,
      remove,
    }: {
      postId: string;
      reaction: ReactionKind;
      remove: boolean;
    }) => (remove ? removePostReaction(postId) : setPostReaction(postId, reaction)),
    onMutate: async ({ postId, reaction, remove }) => {
      await queryClient.cancelQueries({ queryKey: communityFeedQueryKey });
      const current = queryClient.getQueryData<FeedData>(communityFeedQueryKey);
      const previousReactions = current?.pages
        .flatMap((page) => page.items)
        .find((post) => post.id === postId)?.reactions;
      queryClient.setQueryData<FeedData>(communityFeedQueryKey, (current) =>
        mapFeed(current, (post) =>
          post.id === postId
            ? { ...post, reactions: optimisticReaction(post.reactions, reaction, remove) }
            : post,
        ),
      );
      return { previousReactions };
    },
    onError: (_error, { postId }, context) => {
      const previousReactions = context?.previousReactions;
      if (!previousReactions) return;
      queryClient.setQueryData<FeedData>(communityFeedQueryKey, (current) =>
        mapFeed(current, (post) =>
          post.id === postId ? { ...post, reactions: previousReactions } : post,
        ),
      );
    },
    onSuccess: (summary, { postId }) => {
      queryClient.setQueryData<FeedData>(communityFeedQueryKey, (current) =>
        mapFeed(current, (post) =>
          post.id === postId ? { ...post, reactions: summary } : post,
        ),
      );
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: ReportReason }) =>
      reportCommunityPost(postId, reason),
  });

  return { createMutation, deleteMutation, reactionMutation, reportMutation };
}

function mapFeed(
  current: FeedData | undefined,
  transform: (post: CommunityPostView) => CommunityPostView | null,
): FeedData | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map(transform).filter(isPost),
    })),
  };
}

function isPost(post: CommunityPostView | null): post is CommunityPostView {
  return post !== null;
}
