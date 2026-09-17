import { File } from "expo-file-system";

import type { LocalAvatarSourcePhoto } from "./types";

export function createSourcePhotoFile(photo: LocalAvatarSourcePhoto): File {
  return new File(photo.uri);
}
