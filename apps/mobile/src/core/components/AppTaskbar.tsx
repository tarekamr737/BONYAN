import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { useRef, type ComponentProps } from "react";
import { Pressable, StyleSheet, View, type View as NativeView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";
import { useHomeTour, type HomeTourTarget } from "../tour/HomeTour";

type NavItem = { href: string; icon: ComponentProps<typeof Feather>["name"]; label: string; active: boolean };

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
      {items.map(item => <TaskbarItem item={item} key={item.href} path={path} />)}
    </View>
  </View>;
}

function TaskbarItem({item, path}: {item: NavItem; path: string}) {
  const ref = useRef<NativeView>(null);
  const {registerTarget} = useHomeTour();
  const tourTarget = ({"/training": "training-tab", "/nutrition": "nutrition-tab", "/training/coach": "coach-tab", "/community": "community-tab"} as Record<string, HomeTourTarget>)[item.href];
  return <Pressable ref={ref} onLayout={() => {if (tourTarget) registerTarget(tourTarget, ref.current);}} accessibilityRole="button" accessibilityState={{selected: item.active}} onPress={() => {if (path !== item.href) router.navigate(item.href as never);}} style={({pressed}) => [styles.item, item.active && styles.active, pressed && styles.pressed]}>
    <Feather name={item.icon} size={20} color={item.active ? colors.canvas : colors.mutedLight} />
    <Text numberOfLines={1} style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
  </Pressable>;
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
