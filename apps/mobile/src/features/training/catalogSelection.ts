import type {ExerciseSearchItem} from "./types";

export function toggleExerciseSelection(items: ExerciseSearchItem[], item: ExerciseSearchItem, limit = 12) {
  return items.some(selected => selected.id === item.id)
    ? items.filter(selected => selected.id !== item.id)
    : items.length < limit ? [...items, item] : items;
}
