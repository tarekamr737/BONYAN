import type { LocalAvatarSourcePhoto } from "./types";

export function createSourcePhotoFile(photo: LocalAvatarSourcePhoto): Blob {
  if (photo.file) return photo.file;
  return { name: photo.name, type: photo.type, uri: photo.uri } as unknown as Blob;
}
