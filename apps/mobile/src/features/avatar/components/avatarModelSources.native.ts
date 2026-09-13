import type { AvatarPresentation } from "../types";
import manModel from "../../../../public/avatar-3d/man.glb";
import womanModel from "../../../../public/avatar-3d/woman.glb";

export const modelSources: Record<AvatarPresentation, string | number> = {
  men: manModel,
  women: womanModel,
};
