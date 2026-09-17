import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { AvatarView } from "../../features/avatar/types";
import { getAvatarJourney } from "../notifications/appNotifications";
import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";
import { GlassSurface } from "./GlassSurface";

export function AvatarJourneyCard({ arabic, avatar, hasAssessment, onPress }: { arabic: boolean; avatar?: AvatarView; hasAssessment: boolean; onPress: () => void }) {
  const journey = getAvatarJourney(avatar, hasAssessment, arabic);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(journey.progress, { duration: 260, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: ReduceMotion.System }));
  }, [fill, journey.progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(100, fill.get()))}%` as `${number}%` }));
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
      <GlassSurface style={styles.card}>
        <View style={[styles.row, arabic && styles.rowReverse]}>
          <View style={styles.preview}>
            {avatar?.preview_url ? <Image contentFit="cover" source={avatar.preview_url} style={StyleSheet.absoluteFill} transition={180} /> : <Feather color={colors.bronze} name="user" size={34} />}
          </View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{arabic ? "رحلة الأفاتار" : "AVATAR JOURNEY"}</Text>
            <Text style={styles.title}>{journey.status}</Text>
            <Text style={styles.body}>{journey.next}</Text>
          </View>
          <Text style={styles.score}>{journey.progress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: journey.progress }} style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  card: { gap: 16 },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  eyebrow: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.1 },
  fill: { backgroundColor: colors.bronze, borderRadius: 3, height: 6 },
  preview: { alignItems: "center", backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder, borderRadius: 18, borderWidth: 1, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  row: { alignItems: "center", flexDirection: "row", gap: 14 },
  rowReverse: { flexDirection: "row-reverse" },
  score: { color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 18, fontVariant: ["tabular-nums"] },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 17, lineHeight: 23 },
  track: { backgroundColor: colors.surfaceRaised, borderRadius: 3, height: 6, overflow: "hidden" },
});
