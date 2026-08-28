import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

import type { AvatarPresentation, BodyShapeProfile } from "../types";
import { GameAvatar3D } from "./GameAvatar3D";

type BodyFigurePreviewProps = {
  presentation: AvatarPresentation;
  shape: BodyShapeProfile;
};

export function BodyFigurePreview({ presentation, shape }: BodyFigurePreviewProps) {
  return (
    <View style={styles.container}>
      <GameAvatar3D presentation={presentation} shape={shape} />
      <View style={styles.stylePanel}>
        <View style={styles.styleCopy}>
          <Text style={styles.title}>Cinematic 3D</Text>
          <Text style={styles.detail}>
            {presentation === "women" ? "Women" : "Men"} · {shape.toUpperCase()} preview · 6 body profiles
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
  container: { gap: spacing.sm },
  stylePanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
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
