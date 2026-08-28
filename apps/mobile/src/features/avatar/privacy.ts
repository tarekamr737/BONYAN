import type { AvatarView } from "./types";

export function communityEnabledAvatars(avatars: AvatarView[]): AvatarView[] {
  return avatars.filter(
    (avatar) =>
      avatar.state === "approved" &&
      avatar.approved &&
      avatar.public_in_community &&
      avatar.preview_url !== null,
  );
}
