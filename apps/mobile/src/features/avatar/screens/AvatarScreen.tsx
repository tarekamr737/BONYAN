import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { AvatarButton } from "../components/AvatarButton";
import { PrivacyTimeline } from "../components/PrivacyTimeline";
import { useAvatarMutations, useAvatars } from "../hooks";
import { pickAvatarSourcePhoto } from "../photo-picker";
import type { AvatarView, SelectedAvatarPhoto } from "../types";

type AvatarScreenProps = {
  onBack: () => void;
};

export function AvatarScreen({ onBack }: AvatarScreenProps) {
  const avatarsQuery = useAvatars();
  const mutations = useAvatarMutations();
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedAvatarPhoto | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<AvatarView | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const displayedAvatar = activeAvatar ?? avatarsQuery.data?.items[0] ?? null;
  const pending =
    mutations.createMutation.isPending ||
    mutations.approveMutation.isPending ||
    mutations.rejectMutation.isPending ||
    mutations.regenerateMutation.isPending ||
    mutations.communityUseMutation.isPending ||
    mutations.deleteMutation.isPending;
  const mutationError = useMemo(() => {
    const error = [
      mutations.createMutation.error,
      mutations.approveMutation.error,
      mutations.rejectMutation.error,
      mutations.regenerateMutation.error,
      mutations.communityUseMutation.error,
      mutations.deleteMutation.error,
    ].find(Boolean);
    return error instanceof Error ? error.message : null;
  }, [mutations]);

  async function choosePhoto() {
    setPhotoError(null);
    try {
      const photo = await pickAvatarSourcePhoto();
      if (photo) {
        setSelectedPhoto(photo);
        setActiveAvatar(null);
      }
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "The photo could not be selected.");
    }
  }

  function generate() {
    if (!selectedPhoto) return;
    mutations.createMutation.mutate(
      {
        source_image_base64: selectedPhoto.base64,
        source_media_type: selectedPhoto.mediaType,
        style: "athletic editorial portrait",
      },
      {
        onSuccess: (avatar) => {
          setActiveAvatar(avatar);
          setSelectedPhoto(null);
        },
      },
    );
  }

  function updateAvatar(action: { mutate: typeof mutations.approveMutation.mutate }) {
    if (!displayedAvatar) return;
    action.mutate(displayedAvatar.id, { onSuccess: setActiveAvatar });
  }

  function confirmDelete() {
    if (!displayedAvatar) return;
    Alert.alert(
      "Delete avatar?",
      "This permanently removes the private source photo and generated avatar.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            mutations.deleteMutation.mutate(displayedAvatar.id, {
              onSuccess: () => setActiveAvatar(null),
            }),
        },
      ],
    );
  }

  const errorMessage = photoError ?? mutationError;
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.heading}>
            Your avatar
          </Text>
          <View style={styles.headerBalance} />
        </View>

        <View style={styles.privacyPanel}>
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>PRIVATE BY DEFAULT</Text>
          </View>
          <Text style={styles.privacyTitle}>You control every transition.</Text>
          <Text style={styles.privacyCopy}>
            Your source photo is never shown in the community. Approval saves a private avatar;
            sharing remains a separate choice.
          </Text>
          <PrivacyTimeline />
        </View>

        {displayedAvatar?.preview_url ? (
          <View style={styles.previewSection}>
            <View style={styles.previewFrame}>
              <Image
                accessibilityLabel="Generated avatar preview"
                resizeMode="cover"
                source={{ uri: displayedAvatar.preview_url }}
                style={styles.previewImage}
              />
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>
                  {displayedAvatar.public_in_community ? "COMMUNITY ENABLED" : "PRIVATE PREVIEW"}
                </Text>
              </View>
            </View>
            <Text style={styles.previewTitle}>
              {displayedAvatar.approved ? "Approved by you" : "Review before approving"}
            </Text>
            <Text style={styles.previewCopy}>
              {displayedAvatar.approved
                ? "This avatar is saved. It remains private unless you enable community use below."
                : "Check the likeness and tone. Regenerate or reject without publishing anything."}
            </Text>

            {displayedAvatar.state === "ready_for_review" ? (
              <View style={styles.actionStack}>
                <AvatarButton
                  loading={mutations.approveMutation.isPending}
                  onPress={() => updateAvatar(mutations.approveMutation)}
                >
                  Approve avatar
                </AvatarButton>
                <View style={styles.actionRow}>
                  <View style={styles.actionHalf}>
                    <AvatarButton
                      loading={mutations.regenerateMutation.isPending}
                      onPress={() => updateAvatar(mutations.regenerateMutation)}
                      tone="secondary"
                    >
                      Regenerate
                    </AvatarButton>
                  </View>
                  <View style={styles.actionHalf}>
                    <AvatarButton
                      loading={mutations.rejectMutation.isPending}
                      onPress={() => updateAvatar(mutations.rejectMutation)}
                      tone="secondary"
                    >
                      Reject
                    </AvatarButton>
                  </View>
                </View>
              </View>
            ) : null}

            {displayedAvatar.approved ? (
              <View style={styles.communityControl}>
                <View style={styles.communityCopy}>
                  <Text style={styles.communityTitle}>Use in community</Text>
                  <Text style={styles.communityDetail}>
                    Show this approved avatar beside posts you explicitly create.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Use approved avatar in community"
                  disabled={mutations.communityUseMutation.isPending}
                  onValueChange={(enabled) =>
                    mutations.communityUseMutation.mutate(
                      { avatarId: displayedAvatar.id, enabled },
                      { onSuccess: setActiveAvatar },
                    )
                  }
                  thumbColor={colors.text}
                  trackColor={{ false: colors.line, true: colors.bronzeBorder }}
                  value={displayedAvatar.public_in_community}
                />
              </View>
            ) : null}

            {displayedAvatar.state === "failed" ? (
              <AvatarButton
                loading={mutations.regenerateMutation.isPending}
                onPress={() => updateAvatar(mutations.regenerateMutation)}
              >
                Try generation again
              </AvatarButton>
            ) : null}

            <AvatarButton disabled={pending} onPress={confirmDelete} tone="danger">
              Delete source and avatar
            </AvatarButton>
          </View>
        ) : (
          <View style={styles.sourceSection}>
            {selectedPhoto ? (
              <Image
                accessibilityLabel="Selected private source photo"
                resizeMode="cover"
                source={{ uri: selectedPhoto.uri }}
                style={styles.sourceImage}
              />
            ) : (
              <View style={styles.sourcePlaceholder}>
                <Text style={styles.placeholderTitle}>Choose one clear photo</Text>
                <Text style={styles.placeholderCopy}>
                  Face the camera in even light. The original stays private.
                </Text>
              </View>
            )}
            <AvatarButton disabled={pending} onPress={choosePhoto} tone="secondary">
              {selectedPhoto ? "Choose a different photo" : "Choose source photo"}
            </AvatarButton>
            {selectedPhoto ? (
              <AvatarButton loading={mutations.createMutation.isPending} onPress={generate}>
                Generate private preview
              </AvatarButton>
            ) : null}
          </View>
        )}

        {errorMessage ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorTitle}>Something needs attention</Text>
            <Text style={styles.errorCopy}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  backButton: { justifyContent: "center", minHeight: 48, minWidth: 64 },
  backLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  heading: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  headerBalance: { width: 64 },
  privacyPanel: {
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  privateBadge: {
    alignSelf: "flex-start",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  privateBadgeText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  privacyTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  privacyCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  sourceSection: { gap: spacing.sm },
  sourcePlaceholder: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 250,
    padding: spacing.xl,
  },
  placeholderTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    textAlign: "center",
  },
  placeholderCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  sourceImage: { aspectRatio: 1, borderRadius: radii.card, width: "100%" },
  previewSection: { gap: spacing.md },
  previewFrame: { position: "relative" },
  previewImage: { aspectRatio: 1, borderRadius: radii.card, width: "100%" },
  previewBadge: {
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    bottom: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  previewBadgeText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  previewCopy: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  actionStack: { gap: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionHalf: { flex: 1 },
  communityControl: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.md,
  },
  communityCopy: { flex: 1 },
  communityTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  communityDetail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  errorPanel: {
    backgroundColor: colors.surface,
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
});
