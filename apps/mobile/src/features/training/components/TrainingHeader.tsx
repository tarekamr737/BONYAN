import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { StyleSheet, View } from "react-native";

import { colors, fonts, spacing } from "../../../core/theme/tokens";

type TrainingHeaderProps = {
  title: string;
  subtitle: string;
};

export function TrainingHeader({ title, subtitle }: TrainingHeaderProps) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  subtitle: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
  },
});
