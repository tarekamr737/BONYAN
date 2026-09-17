import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { relativeTime } from "../logic";
import type {
  CommunityPostView,
  ReactionKind,
  ReportReason,
} from "../types";

const reactionLabels: Record<ReactionKind, string> = {
  support: "Support",
  strong: "Strong",
  inspired: "Inspired",
};
const reactionLabelsArabic: Record<ReactionKind, string> = {
  support: "بدعمك",
  strong: "قوي",
  inspired: "ملهم",
};

const reportLabels: Record<ReportReason, string> = {
  spam: "Spam or unwanted content",
  harassment: "Harassment or unsafe behavior",
  privacy: "Privacy concern",
  other: "Something else",
};
const reportLabelsArabic: Record<ReportReason, string> = {
  spam: "محتوى مزعج أو غير مرغوب",
  harassment: "مضايقة أو سلوك غير آمن",
  privacy: "مشكلة خصوصية",
  other: "سبب تاني",
};

type PostCardProps = {
  arabic?: boolean;
  post: CommunityPostView;
  reactionBusy: boolean;
  onDelete: (postId: string) => void;
  onReact: (postId: string, reaction: ReactionKind, remove: boolean) => void;
  onReport: (postId: string, reason: ReportReason) => void;
};

export function PostCard({ arabic = false, post, reactionBusy, onDelete, onReact, onReport }: PostCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const initials = initialsFor(post.author.display_name);

  function confirmDelete() {
    Alert.alert(arabic ? "تحذف المنشور؟" : "Delete post?", arabic ? "ده هيحذف منشورك وكل تفاعلاته." : "This removes your post and its reactions.", [
      { text: arabic ? "إلغاء" : "Cancel", style: "cancel" },
      { text: arabic ? "حذف" : "Delete", style: "destructive", onPress: () => onDelete(post.id) },
    ]);
  }

  function chooseReportReason() {
    setReportOpen(true);
  }

  return (
    <View accessibilityLabel={arabic ? `منشور من ${post.author.display_name}` : `Post by ${post.author.display_name}`} style={styles.card}>
      <View style={styles.authorRow}>
        {post.author.avatar_url ? (
          <Image
            accessibilityLabel={arabic ? `صورة ${post.author.display_name} المعتمدة` : `${post.author.display_name}'s approved body avatar`}
            source={{ uri: post.author.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.initialsAvatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.authorCopy}>
          <Text style={styles.authorName}>{post.author.display_name}</Text>
          <Text style={styles.metadata}>
            {post.post_type === "milestone" ? (arabic ? "محطة مهمة" : "Milestone") : (arabic ? "تقدم" : "Progress")} · {relativeTime(post.created_at, renderedAt, arabic)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={post.can_delete ? (arabic ? "حذف المنشور" : "Delete post") : (arabic ? "الإبلاغ عن المنشور" : "Report post")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={post.can_delete ? confirmDelete : chooseReportReason}
          style={styles.textAction}
        >
          <Text style={styles.textActionLabel}>{post.can_delete ? (arabic ? "حذف" : "Delete") : (arabic ? "إبلاغ" : "Report")}</Text>
        </Pressable>
      </View>

      <Text style={styles.caption}>{post.caption}</Text>

      <View accessibilityLabel={arabic ? "تفاعلات المنشور" : "Post reactions"} style={styles.reactionRow}>
        {(Object.keys(reactionLabels) as ReactionKind[]).map((reaction) => {
          const selected = post.reactions.viewer_reaction === reaction;
          const count = post.reactions.counts[reaction] ?? 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: reactionBusy, selected }}
              disabled={reactionBusy}
              key={reaction}
              onPress={() => onReact(post.id, reaction, selected)}
              style={({ pressed }) => [
                styles.reaction,
                selected && styles.reactionSelected,
                reactionBusy && styles.reactionDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>
                {(arabic ? reactionLabelsArabic : reactionLabels)[reaction]}
                {count > 0 ? ` ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setReportOpen(false)}
        transparent
        visible={reportOpen}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.reportSheet}>
            <Text accessibilityRole="header" style={styles.reportTitle}>
              {arabic ? "الإبلاغ عن المنشور" : "Report post"}
            </Text>
            <Text style={styles.reportCopy}>
              {arabic ? "اختار السبب الأنسب لحماية المجتمع." : "Choose the reason that best protects the community."}
            </Text>
            {(Object.keys(reportLabels) as ReportReason[]).map((reason) => (
              <Pressable
                accessibilityRole="button"
                key={reason}
                onPress={() => {
                  setReportOpen(false);
                  onReport(post.id, reason);
                }}
                style={({ pressed }) => [styles.reportReason, pressed && styles.pressed]}
              >
                <Text style={styles.reportReasonLabel}>{(arabic ? reportLabelsArabic : reportLabels)[reason]}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setReportOpen(false)}
              style={({ pressed }) => [styles.reportCancel, pressed && styles.pressed]}
            >
              <Text style={styles.reportCancelLabel}>{arabic ? "إلغاء" : "Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function initialsFor(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  authorRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  avatar: { borderRadius: radii.control, height: 48, width: 48 },
  initialsAvatar: {
    alignItems: "center",
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  initials: { color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 14 },
  authorCopy: { flex: 1 },
  authorName: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  metadata: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  textAction: { alignItems: "flex-end", justifyContent: "center", minHeight: 48, minWidth: 48 },
  textActionLabel: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 12 },
  caption: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  reactionRow: { flexDirection: "row", gap: spacing.xs },
  reaction: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  reactionSelected: { backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder },
  reactionDisabled: { opacity: 0.55 },
  reactionLabel: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  reactionLabelSelected: { color: colors.bronze },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  reportSheet: {
    alignSelf: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%",
  },
  reportTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
  },
  reportCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  reportReason: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  reportReasonLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  reportCancel: { alignItems: "center", justifyContent: "center", marginTop: spacing.sm, minHeight: 48 },
  reportCancelLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  pressed: { opacity: 0.72 },
});
