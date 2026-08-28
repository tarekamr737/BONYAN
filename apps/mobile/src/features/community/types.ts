export type PostType = "milestone" | "progress";
export type ReactionKind = "support" | "strong" | "inspired";
export type ReportReason = "spam" | "harassment" | "privacy" | "other";

export type PostAuthorView = {
  display_name: string;
  avatar_url: string | null;
};

export type ReactionSummaryView = {
  counts: Partial<Record<ReactionKind, number>>;
  viewer_reaction: ReactionKind | null;
};

export type CommunityPostView = {
  id: string;
  post_type: PostType;
  caption: string;
  author: PostAuthorView;
  reactions: ReactionSummaryView;
  created_at: string;
  can_delete: boolean;
};

export type CommunityFeedView = {
  items: CommunityPostView[];
  next_cursor: string | null;
};

export type CreatePostPayload = {
  post_type: PostType;
  caption: string;
  avatar_id: string | null;
};
