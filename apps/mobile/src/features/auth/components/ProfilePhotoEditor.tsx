import {useLocale} from "../../../core/i18n/LocaleProvider";
import { phrase } from "../../../core/i18n/copy";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";

import { AppButton, ProfileAvatar } from "../../../core/components";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { colors } from "../../../core/theme/tokens";
import { deleteMyProfilePhoto, uploadMyProfilePhoto } from "../api/profileApi";
import type { UserProfile } from "../types";
import { GlassCard, ui } from "./CoachingUI";

export function ProfilePhotoEditor({ profile }: { profile: UserProfile }) {
  const {rtl: arabic} = useLocale();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const upload = useMutation({
    mutationFn: uploadMyProfilePhoto,
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", "me"], updated);
      setNotice({
        message: phrase("copy_f3f23e0ccb76", arabic),
        tone: "success",
      });
    },
  });
  const remove = useMutation({
    mutationFn: deleteMyProfilePhoto,
    onSuccess: () => {
      queryClient.setQueryData<UserProfile>(["profile", "me"], (current) =>
        current
          ? { ...current, has_profile_photo: false, profile_photo_updated_at: null }
          : current,
      );
      setNotice({
        message: phrase("copy_adcc0637325b", arabic),
        tone: "success",
      });
    },
  });

  async function choosePhoto() {
    setNotice(null);
    upload.reset();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice({
          message: phrase("copy_3b824b2d4569", arabic),
          tone: "error",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.82,
      });
      const selected = result.assets?.[0];
      if (result.canceled || !selected) return;
      upload.mutate({
        file: selected.file,
        name: selected.fileName ?? `profile-photo.${selected.mimeType?.split("/")[1] ?? "jpg"}`,
        type: selected.mimeType ?? "image/jpeg",
        uri: selected.uri,
      });
    } catch {
      setNotice({
        message: phrase("copy_82da3abcf836", arabic),
        tone: "error",
      });
    }
  }

  const pending = upload.isPending || remove.isPending;
  const error = upload.error ?? remove.error;
  return (
    <GlassCard>
      <View style={[ui.row, { alignItems: "center", flexWrap: "nowrap" }]}>
        <ProfileAvatar
          accessibilityLabel={phrase("copy_0f5992eea234", arabic)}
          displayName={profile.display_name}
          hasPhoto={profile.has_profile_photo}
          photoUpdatedAt={profile.profile_photo_updated_at}
          size={84}
        />
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={[ui.heading, arabic && ui.rtl]}>
            {phrase("copy_de2847cd4922", arabic)}
          </Text>
          <Text style={[ui.small, arabic && ui.rtl]}>
            {phrase("copy_4f658ab58c9a", arabic)}
          </Text>
        </View>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[ui.small, { color: colors.error }, arabic && ui.rtl]}
        >
          {phrase("copy_61fcf231ad43", arabic)}
        </Text>
      ) : null}
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            ui.small,
            { color: notice.tone === "success" ? colors.positive : colors.error },
            arabic && ui.rtl,
          ]}
        >
          {notice.message}
        </Text>
      ) : null}
      <View style={[ui.row, { alignItems: "stretch" }]}>
        <View style={{ flex: 1, minWidth: 170 }}>
          <AppButton
            label={
              profile.has_profile_photo
                ? phrase("copy_65cd590e1720", arabic)
                : phrase("copy_bc69feee80d2", arabic)
            }
            disabled={pending}
            loading={upload.isPending}
            onPress={() => void choosePhoto()}
            variant="secondary"
          />
        </View>
        {profile.has_profile_photo ? (
          <View style={{ flex: 1, minWidth: 140 }}>
            <AppButton
              label={phrase("copy_46aa3ae4ad11", arabic)}
              disabled={pending}
              loading={remove.isPending}
              onPress={() => remove.mutate()}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
      {pending ? (
        <Text style={[ui.small, arabic && ui.rtl]}>
          {phrase("copy_22da77e5913f", arabic)}
        </Text>
      ) : null}
    </GlassCard>
  );
}
