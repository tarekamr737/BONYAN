import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "../theme/tokens";

export function SurfaceCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
