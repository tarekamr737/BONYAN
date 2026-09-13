import type { AvatarPresentation } from "../types";

export const modelSources: Record<AvatarPresentation, string | number> = {
  men: process.env.EXPO_PUBLIC_AVATAR_MEN_MODEL_URL || "/avatar-3d/man.glb",
  women: process.env.EXPO_PUBLIC_AVATAR_WOMEN_MODEL_URL || "/avatar-3d/woman.glb",
};
