import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";

export function AppTaskbar({arabic}: {arabic: boolean}) {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const items = [
    {href: "/", icon: "home", label: arabic ? "الرئيسية" : "Home", active: path === "/"},
    {href: "/training", icon: "activity", label: arabic ? "التدريب" : "Training", active: path.startsWith("/training") && !path.startsWith("/training/coach")},
    {href: "/nutrition", icon: "heart", label: arabic ? "التغذية" : "Nutrition", active: path.startsWith("/nutrition")},
    {href: "/training/coach", icon: "cpu", label: arabic ? "الكوتش" : "Coach", active: path.startsWith("/training/coach")},
    {href: "/community", icon: "users", label: arabic ? "المجتمع" : "Community", active: path.startsWith("/community")},
  ] as const;
  return <View style={[styles.shell, {paddingBottom: Math.max(insets.bottom, 7)}]}>
    <View style={[styles.items, arabic && styles.reverse]}>
      {items.map(item => <Pressable key={item.href} accessibilityRole="button" accessibilityState={{selected: item.active}} onPress={() => {if (!item.active) router.navigate(item.href);}} style={({pressed}) => [styles.item, item.active && styles.active, pressed && styles.pressed]}>
        <Feather name={item.icon} size={20} color={item.active ? colors.canvas : colors.mutedLight} />
        <Text numberOfLines={1} style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  active: { backgroundColor: colors.bronze },
  activeLabel: { color: colors.canvas },
  item: { alignItems: "center", borderRadius: 13, flex: 1, gap: 3, justifyContent: "center", minHeight: 54, paddingHorizontal: 2 },
  items: { alignSelf: "center", flexDirection: "row", gap: 4, maxWidth: 660, width: "100%" },
  label: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 9, textAlign: "center" },
  pressed: { opacity: 0.72 },
  reverse: { flexDirection: "row-reverse" },
  shell: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 7 },
});
