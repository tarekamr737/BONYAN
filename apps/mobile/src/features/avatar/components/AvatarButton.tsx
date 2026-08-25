import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

type AvatarButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
}>;

export function AvatarButton({
  children,
  disabled = false,
  loading = false,
  onPress,
  tone = "primary",
}: AvatarButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[tone],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === "primary" ? colors.canvas : colors.text} />
      ) : (
        <Text style={[styles.label, tone === "primary" && styles.primaryLabel]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.bronze,
    borderColor: colors.bronze,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  label: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  primaryLabel: { color: colors.canvas },
});
