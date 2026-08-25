import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { useAvatars } from "../../avatar/hooks";
import { communityEnabledAvatars } from "../../avatar/privacy";
import { useCommunityMutations } from "../hooks";
import type { PostType } from "../types";

type CreatePostScreenProps = {
  onBack: () => void;
  onManageAvatar: () => void;
  onPosted: () => void;
};

export function CreatePostScreen({
  onBack,
  onManageAvatar,
  onPosted,
}: CreatePostScreenProps) {
  const avatarsQuery = useAvatars();
  const { createMutation } = useCommunityMutations();
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<PostType>("milestone");
  const [useAvatar, setUseAvatar] = useState(true);
  const approvedAvatar = useMemo(
    () => communityEnabledAvatars(avatarsQuery.data?.items ?? [])[0] ?? null,
    [avatarsQuery.data],
  );
  const canSubmit =
    caption.trim().length > 0 &&
    !avatarsQuery.isPending &&
    !createMutation.isPending;

  function submit() {
    if (!canSubmit) return;
    createMutation.mutate(
      {
        avatar_id: useAvatar && approvedAvatar ? approvedAvatar.id : null,
        caption: caption.trim(),
        post_type: postType,
      },
      { onSuccess: onPosted },
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionLabel}>Cancel</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.heading}>
              Share progress
            </Text>
            <View style={styles.headerBalance} />
          </View>

          <Text style={styles.intro}>
            Write the part you intend to share. BONYAN never inserts measurements or report data.
          </Text>

          <View accessibilityLabel="Post type" style={styles.segmentedControl}>
            {(["milestone", "progress"] as PostType[]).map((type) => {
              const selected = postType === type;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={type}
                  onPress={() => setPostType(type)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                    {type === "milestone" ? "Milestone" : "Progress note"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Post caption"
              maxLength={500}
              multiline
              onChangeText={setCaption}
              placeholder="What changed, and what helped you keep going?"
              placeholderTextColor={colors.muted}
              style={styles.input}
              textAlignVertical="top"
              value={caption}
            />
            <Text style={styles.count}>{caption.length}/500</Text>
          </View>

          {avatarsQuery.isPending ? (
            <View accessibilityLabel="Checking approved avatars" style={styles.avatarEmpty}>
              <ActivityIndicator color={colors.bronze} />
              <View style={styles.avatarCopy}>
                <Text style={styles.avatarTitle}>Checking your avatar privacy</Text>
                <Text style={styles.avatarDetail}>
                  Publishing waits until your approved community setting is known.
                </Text>
              </View>
            </View>
          ) : avatarsQuery.isError && !avatarsQuery.data ? (
            <View accessibilityRole="alert" style={styles.avatarEmpty}>
              <View style={styles.avatarCopy}>
                <Text style={styles.avatarTitle}>Avatar status could not load</Text>
                <Text style={styles.avatarDetail}>
                  Retry to attach an avatar, or publish without one. No avatar will be added
                  automatically.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void avatarsQuery.refetch()}
                style={styles.manageButton}
              >
                <Text style={styles.manageLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : approvedAvatar ? (
            <View style={styles.avatarControl}>
              {approvedAvatar.preview_url ? (
                <Image source={{ uri: approvedAvatar.preview_url }} style={styles.avatarImage} />
              ) : null}
              <View style={styles.avatarCopy}>
                <Text style={styles.avatarTitle}>Use approved avatar</Text>
                <Text style={styles.avatarDetail}>
                  Only the generated avatar appears. Your source photo stays private.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Use approved avatar on this post"
                onValueChange={setUseAvatar}
                thumbColor={colors.text}
                trackColor={{ false: colors.line, true: colors.bronzeBorder }}
                value={useAvatar}
              />
            </View>
          ) : (
            <View style={styles.avatarEmpty}>
              <View style={styles.avatarCopy}>
                <Text style={styles.avatarTitle}>No community avatar enabled</Text>
                <Text style={styles.avatarDetail}>
                  You can post without one, or approve an avatar and explicitly enable it.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={onManageAvatar}
                style={styles.manageButton}
              >
                <Text style={styles.manageLabel}>Manage avatar</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.privacyNote}>
            <Text style={styles.privacyTitle}>WHAT WILL BE SHARED</Text>
            <Text style={styles.privacyCopy}>
              Your display name, this caption, and the approved avatar only if the switch is on.
            </Text>
          </View>

          {createMutation.isError ? (
            <View accessibilityRole="alert" style={styles.errorPanel}>
              <Text style={styles.errorTitle}>Post was not created</Text>
              <Text style={styles.errorCopy}>
                Nothing was published. Check your connection and avatar setting, then try again.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.submitDisabled,
              pressed && canSubmit && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitLabel}>
              {createMutation.isPending ? "Publishing…" : "Publish post"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: 640,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  header: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  headerAction: { justifyContent: "center", minHeight: 48, minWidth: 64 },
  headerActionLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  heading: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 23,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  headerBalance: { width: 64 },
  intro: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  segmentedControl: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  segmentSelected: { backgroundColor: colors.surfaceRaised },
  segmentLabel: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 13 },
  segmentLabelSelected: { color: colors.text, fontFamily: fonts.bodySemiBold },
  composer: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    minHeight: 220,
    padding: spacing.md,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 160,
  },
  count: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, textAlign: "right" },
  avatarControl: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 84,
    padding: spacing.md,
  },
  avatarImage: { borderRadius: 12, height: 52, width: 52 },
  avatarCopy: { flex: 1 },
  avatarTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  avatarDetail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  avatarEmpty: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    gap: spacing.md,
    padding: spacing.md,
  },
  manageButton: { justifyContent: "center", minHeight: 48 },
  manageLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  privacyNote: { borderTopColor: colors.line, borderTopWidth: 1, paddingTop: spacing.md },
  privacyTitle: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  privacyCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  errorPanel: {
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  errorCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 52,
  },
  submitDisabled: { opacity: 0.45 },
  submitPressed: { opacity: 0.78 },
  submitLabel: { color: colors.canvas, fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
