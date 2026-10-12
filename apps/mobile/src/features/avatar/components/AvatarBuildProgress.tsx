import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

export function AvatarBuildProgress({ arabic = false, stage }: { arabic?: boolean; stage: string }) {
  return (
    <View accessibilityLabel={phrase("copy_952640f2d2de", arabic)} style={styles.panel}>
      <ActivityIndicator color={colors.bronze} size="large" />
      <Text style={styles.title}>{phrase("copy_69963d816b73", arabic)}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.stage}>{stage}</Text>
      <Text style={styles.note}>{phrase("copy_24e37122d2ba", arabic)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20, textAlign: "center" },
  stage: { color: colors.bronze, fontFamily: fonts.bodyMedium, fontSize: 13, textAlign: "center" },
  note: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
