import { describe, expect, it } from "vitest";

import {
  optimisticReaction,
  relativeTime,
} from "../src/features/community/logic";

describe("optimisticReaction", () => {
  it("moves the viewer reaction without inflating totals", () => {
    expect(
      optimisticReaction(
        { counts: { inspired: 0, strong: 1, support: 2 }, viewer_reaction: "support" },
        "inspired",
        false,
      ),
    ).toEqual({
      counts: { inspired: 1, strong: 1, support: 1 },
      viewer_reaction: "inspired",
    });
  });

  it("removes an existing reaction without producing negative counts", () => {
    expect(
      optimisticReaction(
        { counts: { inspired: 0, strong: 0, support: 0 }, viewer_reaction: "support" },
        "support",
        true,
      ),
    ).toEqual({
      counts: { inspired: 0, strong: 0, support: 0 },
      viewer_reaction: null,
    });
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-08-25T12:00:00Z");

  it.each([
    ["2026-08-25T11:59:45Z", "now"],
    ["2026-08-25T11:42:00Z", "18m"],
    ["2026-08-25T08:00:00Z", "4h"],
    ["2026-08-22T12:00:00Z", "3d"],
  ])("formats %s as %s", (value, expected) => {
    expect(relativeTime(value, now)).toBe(expected);
  });
});
