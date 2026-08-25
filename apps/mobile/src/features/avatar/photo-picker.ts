import * as ImagePicker from "expo-image-picker";

import type { SelectedAvatarPhoto } from "./types";

export class AvatarPhotoPickerError extends Error {}

export async function pickAvatarSourcePhoto(): Promise<SelectedAvatarPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AvatarPhotoPickerError(
      "Photo access is required to choose an avatar source. You can change this in device settings.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    mediaTypes: ["images"],
    quality: 0.72,
  });
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    throw new AvatarPhotoPickerError(
      "The selected photo could not be read. Choose another image and try again.",
    );
  }
  const mediaType = normalizeMediaType(asset.mimeType, asset.fileName);
  if (!asset.base64 || !mediaType) {
    throw new AvatarPhotoPickerError(
      "Choose a JPEG, PNG, or WebP image smaller than 5 MB.",
    );
  }
  return { uri: asset.uri, base64: asset.base64, mediaType };
}

function normalizeMediaType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): SelectedAvatarPhoto["mediaType"] | null {
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp") {
    return mimeType;
  }
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}
