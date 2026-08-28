import { StyleSheet, Text, View } from "react-native";

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
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  subtitle: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 40,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
});
