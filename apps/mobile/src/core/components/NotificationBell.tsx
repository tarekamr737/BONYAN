import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";

export function NotificationBell({ arabic, count, onPress }: { arabic: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={arabic ? `الإشعارات، ${count} تحتاج انتباهك` : `Notifications, ${count} need attention`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Feather color={colors.text} name="bell" size={21} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(count, 9)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: colors.bronze, borderColor: colors.canvas, borderRadius: 9, borderWidth: 2, height: 18, justifyContent: "center", position: "absolute", right: -3, top: -3, width: 18 },
  badgeText: { color: colors.canvas, fontFamily: fonts.bodySemiBold, fontSize: 10, lineHeight: 12, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: colors.surfaceRaised, borderColor: colors.line, borderRadius: 16, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
