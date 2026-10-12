import type {ProgressScore} from "./api";

// Partial internal estimates must not become displayed personal scores or trends.
export function visibleProgressValue(score: ProgressScore): number | null {
  return score.ranked ? score.value : null;
}
