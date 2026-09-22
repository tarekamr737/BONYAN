import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { colors, fonts, radii, spacing } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";

export function CinematicHero({ arabic, source, subtitle, title }: { arabic: boolean; source: number; subtitle: string; title: string }) {
  return <View style={styles.hero}>
    <Image accessibilityIgnoresInvertColors contentFit="cover" source={source} style={StyleSheet.absoluteFill} transition={180} />
    <View style={styles.scrim} />
    <View style={styles.copy}>
      <Text accessibilityRole="header" style={[styles.title, arabic && styles.rtl]}>{title}</Text>
      <Text style={[styles.subtitle, arabic && styles.rtl]}>{subtitle}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  copy: { gap: spacing.xs, maxWidth: "62%", padding: spacing.lg },
  hero: { borderColor: colors.bronzeBorder, borderRadius: radii.card, borderWidth: 1, justifyContent: "flex-end", minHeight: 210, overflow: "hidden" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  scrim: { backgroundColor: "rgba(0,0,0,0.24)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  subtitle: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20 },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -0.8, lineHeight: 34 },
});
