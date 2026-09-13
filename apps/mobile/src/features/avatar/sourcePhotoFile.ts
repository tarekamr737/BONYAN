import type { LocalAvatarSourcePhoto } from "./types";

export function createSourcePhotoFile(photo: LocalAvatarSourcePhoto): Blob {
  if (photo.file) return photo.file;
  throw new Error("The selected photo is unavailable. Choose it again.");
}
