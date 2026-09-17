import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";

export function AppTaskbar({arabic}: {arabic: boolean}) {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return <View style={{backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, paddingHorizontal: 20}}>
    <View style={{flexDirection: arabic ? "row-reverse" : "row", gap: 12, maxWidth: 660, width: "100%", alignSelf: "center"}}>
      {([{href: "/", icon: "home", label: arabic ? "الرئيسية" : "Home"}, {href: "/training/coach", icon: "message-circle", label: arabic ? "الكوتش بنيان" : "Bonyan Coach"}] as const).map(item => <Pressable key={item.href} accessibilityRole="button" accessibilityState={{selected: path === item.href}} onPress={() => {if (path !== item.href) router.navigate(item.href);}} style={({pressed}) => ({flex: 1, minHeight: 50, flexDirection: arabic ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, backgroundColor: path === item.href ? colors.bronzeSoft : "transparent", opacity: pressed ? .7 : 1})}>
        <Feather name={item.icon} size={21} color={colors.bronze} /><Text style={{color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, textAlign: "center"}}>{item.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
