import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { useLocale } from "../../core/i18n/LocaleProvider";
import { goBackOr } from "../../core/navigation/safeNavigation";
import { colors, fonts, radii, spacing } from "../../core/theme/tokens";

export function GamePage({title, children}: PropsWithChildren<{title: string}>) {
  const {t} = useLocale();
  return <SafeAreaView style={gameStyles.page}><ScrollView contentContainerStyle={gameStyles.content}><Action label={t("back")} onPress={() => goBackOr("/")}/><Text accessibilityRole="header" style={gameStyles.title}>{title}</Text>{children}</ScrollView></SafeAreaView>;
}
export function Action({label, onPress, disabled = false, selected = false}: {label: string; onPress: () => void; disabled?: boolean; selected?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled, selected}} disabled={disabled} onPress={onPress} style={[gameStyles.button, selected && gameStyles.selected, disabled && {opacity: 0.5}]}><Text style={gameStyles.label}>{label}</Text></Pressable>;
}
export function QueryNotice({pending, error, retry}: {pending: boolean; error: Error | null; retry: () => void}) {
  const {t} = useLocale(); return pending ? <Text style={gameStyles.copy}>{t("loading")}</Text> : error ? <View accessibilityRole="alert"><Text style={gameStyles.copy}>{error.message}</Text><Action label={t("retry")} onPress={retry}/></View> : null;
}
export const gameStyles = StyleSheet.create({page: {backgroundColor: colors.canvas, flex: 1}, content: {padding: spacing.lg, gap: spacing.md, maxWidth: 660, width: "100%", alignSelf: "center"}, title: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 24}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 22}, label: {color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14}, button: {minHeight: 50, borderWidth: 1, borderColor: colors.bronzeBorder, borderRadius: radii.control, padding: spacing.sm, justifyContent: "center"}, selected: {backgroundColor: colors.bronzeSoft}, row: {flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm}, image: {width: 54, height: 54, borderRadius: radii.control}, input: {color: colors.text, fontFamily: fonts.body, borderWidth: 1, borderColor: colors.line, borderRadius: radii.control, padding: spacing.sm, minHeight: 50}});
