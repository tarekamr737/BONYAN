import type { ReactionKind, ReactionSummaryView } from "./types";

export function optimisticReaction(
  current: ReactionSummaryView,
  nextReaction: ReactionKind,
  remove: boolean,
): ReactionSummaryView {
  const counts = { ...current.counts };
  const previousReaction = current.viewer_reaction;
  if (previousReaction) {
    counts[previousReaction] = Math.max(0, (counts[previousReaction] ?? 1) - 1);
  }
  if (!remove) {
    counts[nextReaction] = (counts[nextReaction] ?? 0) + 1;
  }
  return { counts, viewer_reaction: remove ? null : nextReaction };
}

export function relativeTime(value: string, now = Date.now()): string {
  const differenceMinutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60_000),
  );
  if (differenceMinutes < 1) return "now";
  if (differenceMinutes < 60) return `${differenceMinutes}m`;
  const differenceHours = Math.floor(differenceMinutes / 60);
  if (differenceHours < 24) return `${differenceHours}h`;
  return `${Math.floor(differenceHours / 24)}d`;
}
