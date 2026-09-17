import { type PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii, spacing } from "../theme/tokens";

export function GlassBackdrop() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]} />;
}

export function GlassSurface({children, style, ...props}: PropsWithChildren<ViewProps>) {
  return <View {...props} style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.canvas },
  card: {backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, overflow: "hidden"},
});
