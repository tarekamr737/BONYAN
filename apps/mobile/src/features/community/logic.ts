import { phrase, phraseTemplate } from "../../core/i18n/copy";
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

export function relativeTime(value: string, now = Date.now(), arabic = false): string {
  const differenceMinutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60_000),
  );
  if (differenceMinutes < 1) return phrase("copy_0278e008acde", arabic);
  if (differenceMinutes < 60) return phraseTemplate("copy_d640522759b2", arabic, (arabic) ? [differenceMinutes] : [differenceMinutes]);
  const differenceHours = Math.floor(differenceMinutes / 60);
  if (differenceHours < 24) return phraseTemplate("copy_a61c7c2ff430", arabic, (arabic) ? [differenceHours] : [differenceHours]);
  const days = Math.floor(differenceHours / 24);
  return phraseTemplate("copy_15d7671f73ff", arabic, (arabic) ? [days] : [days]);
}
