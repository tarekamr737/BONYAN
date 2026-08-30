import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../theme/tokens";
import { AppButton } from "./AppButton";

type ScreenStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title?: string;
  variant: "empty" | "error" | "loading";
};

export function ScreenState({
  actionLabel,
  message,
  onAction,
  title,
  variant,
}: ScreenStateProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={variant === "error" ? "alert" : "summary"}
      style={styles.container}
    >
      {variant === "loading" ? <ActivityIndicator color={colors.bronze} size="small" /> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={variant === "error" ? styles.errorMessage : styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
  },
  message: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  errorMessage: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
    marginTop: spacing.xs,
  },
});
