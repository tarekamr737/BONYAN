export type AvatarState =
  | "requested"
  | "processing"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "failed";

export type AvatarView = {
  id: string;
  state: AvatarState;
  style: string;
  preview_url: string | null;
  approved: boolean;
  public_in_community: boolean;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
};

export type AvatarListView = {
  items: AvatarView[];
};

export type SelectedAvatarPhoto = {
  uri: string;
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

export type CreateAvatarPayload = {
  source_image_base64: string;
  source_media_type: SelectedAvatarPhoto["mediaType"];
  style: string;
};
