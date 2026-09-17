import { DirectionalText as Text } from "./DirectionalText";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";

import { colors, fonts, radii, spacing } from "../theme/tokens";

type AppButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  loading?: boolean;
  variant?: "danger" | "primary" | "secondary";
};

export function AppButton({
  disabled = false,
  label,
  loading = false,
  variant = "primary",
  ...props
}: AppButtonProps) {
  const unavailable = disabled || loading;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      style={({ pressed }) => [
        styles.base,
        variant === "primary"
          ? styles.primary
          : variant === "danger"
            ? styles.danger
            : styles.secondary,
        pressed && !unavailable ? styles.pressed : undefined,
        unavailable ? styles.disabled : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.canvas : variant === "danger" ? colors.error : colors.bronze}
          size="small"
        />
      ) : (
        <Text
          style={
            variant === "primary"
              ? styles.primaryLabel
              : variant === "danger"
                ? styles.dangerLabel
                : styles.secondaryLabel
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.bronze,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: colors.bronzeBorder,
    borderWidth: 1,
  },
  danger: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.78,
    transform: [{scale: 0.985}],
  },
  disabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    textAlign: "center",
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  secondaryLabel: {
    textAlign: "center",
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  dangerLabel: {
    textAlign: "center",
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
