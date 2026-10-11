import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useLocale } from "../i18n/LocaleProvider";
import { showContextualCoach } from "../navigation/tabs";
import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";
export function CoachShortcut() {
  const path = usePathname(); const { t, rtl } = useLocale();
  if (!showContextualCoach(path)) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={t("askCoach")} style={[styles.control, {flexDirection: rtl ? "row-reverse" : "row"}]} onPress={() => router.push("/training/coach")}><Feather name="message-circle" color={colors.bronze} size={20} /><Text style={styles.text}>{t("askCoach")}</Text><Feather name={rtl ? "arrow-left" : "arrow-right"} color={colors.bronze} size={18} /></Pressable>;
}
const styles = StyleSheet.create({control: {alignItems: "center", justifyContent: "center", minHeight: 50, gap: 12, backgroundColor: colors.canvas, borderTopColor: colors.line, borderTopWidth: 1}, text: {color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14}});
