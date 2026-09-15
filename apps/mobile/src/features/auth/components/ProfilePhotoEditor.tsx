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
  const arabic = profile.preferred_language.startsWith("ar");
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const upload = useMutation({
    mutationFn: uploadMyProfilePhoto,
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", "me"], updated);
      setNotice({
        message: arabic ? "تم تحديث صورة ملفك." : "Your profile photo is updated.",
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
        message: arabic ? "تم حذف صورة الملف." : "Your profile photo was removed.",
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
          message: arabic
            ? "اسمح لبُنيان بالوصول للصور من إعدادات جهازك، ثم حاول مرة أخرى."
            : "Allow BONYAN to access your photos in device settings, then try again.",
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
        message: arabic
          ? "تعذّر فتح مكتبة الصور. حاول مرة أخرى."
          : "Couldn’t open your photo library. Please try again.",
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
          accessibilityLabel={arabic ? "صورة ملفي" : "My profile photo"}
          displayName={profile.display_name}
          hasPhoto={profile.has_profile_photo}
          photoUpdatedAt={profile.profile_photo_updated_at}
          size={84}
        />
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={[ui.heading, arabic && ui.rtl]}>
            {arabic ? "صورتك الشخصية" : "Your profile photo"}
          </Text>
          <Text style={[ui.small, arabic && ui.rtl]}>
            {arabic
              ? "اختر صورة واضحة. هتفضل خاصة بحسابك وتقدر تغيّرها في أي وقت."
              : "Choose a clear photo. It stays private to your account and can be changed anytime."}
          </Text>
        </View>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[ui.small, { color: colors.error }, arabic && ui.rtl]}
        >
          {arabic
            ? "تعذّر حفظ الصورة. استخدم JPEG أو PNG أو WebP أصغر من 10 ميجابايت."
            : "Couldn’t save the photo. Use a JPEG, PNG, or WebP smaller than 10 MB."}
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
                ? arabic ? "تغيير الصورة" : "Change photo"
                : arabic ? "اختيار صورة" : "Choose photo"
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
              label={arabic ? "حذف الصورة" : "Remove photo"}
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
          {arabic ? "جاري تحديث الصورة…" : "Updating your photo…"}
        </Text>
      ) : null}
    </GlassCard>
  );
}
