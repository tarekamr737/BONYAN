import { describe, expect, it } from "vitest";

import { communityEnabledAvatars } from "../src/features/avatar/privacy";
import type { AvatarView } from "../src/features/avatar/types";

function avatar(overrides: Partial<AvatarView> = {}): AvatarView {
  return {
    presentation: "men",
    shape_profile: "fit",
    approved: true,
    created_at: "2026-08-25T10:00:00Z",
    failure_code: null,
    id: "avatar-1",
    measurement_source: "inbody",
    measurements_recorded_at: "2026-08-24T10:00:00Z",
    preview_url: "https://private.example/preview",
    public_in_community: true,
    state: "approved",
    style: "bronze",
    updated_at: "2026-08-25T10:00:00Z",
    ...overrides,
  };
}

describe("communityEnabledAvatars", () => {
  it("exposes only approved avatars explicitly enabled for community", () => {
    const visible = communityEnabledAvatars([
      avatar(),
      avatar({ id: "private", public_in_community: false }),
      avatar({ id: "review", approved: false, state: "ready_for_review" }),
      avatar({ id: "missing-preview", preview_url: null }),
    ]);

    expect(visible.map((item) => item.id)).toEqual(["avatar-1"]);
  });
});
