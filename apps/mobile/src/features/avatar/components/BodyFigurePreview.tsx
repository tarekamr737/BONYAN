import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

import type { AvatarPresentation } from "../types";

const cinematicPreviews = {
  men: require("../../../../assets/avatar-styles/cinematic-men-athletic.png"),
  women: require("../../../../assets/avatar-styles/cinematic-women-athletic.png"),
};

export function BodyFigurePreview({ presentation }: { presentation: AvatarPresentation }) {
  return (
    <View
      accessibilityLabel={`Selected Cinematic 3D ${presentation} full-body avatar style`}
      accessibilityRole="image"
      style={styles.stage}
    >
      <Image resizeMode="cover" source={cinematicPreviews[presentation]} style={styles.image} />
      <View style={styles.stylePanel}>
        <View style={styles.styleCopy}>
          <Text style={styles.title}>Cinematic 3D</Text>
          <Text style={styles.detail}>
            {presentation === "women" ? "Women" : "Men"} · measurement-shaped build
          </Text>
        </View>
        <View style={styles.selectedBadge}>
          <View style={styles.selectedDot} />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  image: { height: "100%", width: "100%" },
  stylePanel: {
    alignItems: "center",
    backgroundColor: "rgba(11, 11, 11, 0.92)",
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  styleCopy: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  detail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  selectedBadge: {
    alignItems: "center",
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  selectedDot: { backgroundColor: colors.bronze, borderRadius: 4, height: 8, width: 8 },
  selectedText: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 11 },
});
