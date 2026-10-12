import {router} from "expo-router";
import {Pressable, StyleSheet, View} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import {useLocale} from "../i18n/LocaleProvider";
import {useAppNotifications} from "../notifications/useAppNotifications";
import {colors, fonts} from "../theme/tokens";
import {BrandMark} from "./BrandMark";
import {NotificationBell} from "./NotificationBell";
import {ProfileAvatar} from "./ProfileAvatar";
import {DirectionalText as Text} from "./DirectionalText";

export function FeatureHeader({title, subtitle, onBack, onInfo, showProfile = true}: {title: string; subtitle?: string; onBack?: () => void; onInfo?: () => void; showProfile?: boolean}) {
  const {t, rtl} = useLocale(); const {profile, requiresActionCount} = useAppNotifications();
  const infoControl = onInfo ? <Pressable accessibilityRole="button" accessibilityLabel={t("screenDetails")} onPress={onInfo} style={{height: 48, width: 48, alignItems: "center", justifyContent: "center"}}><Feather name="info" size={22} color={colors.green}/></Pressable> : null;
  return <View style={{gap: 12}}><View style={[styles.row, rtl && styles.reverse]}><View style={[styles.brand, rtl && styles.reverse]}>{rtl ? infoControl : null}{onBack ? <Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={onBack} style={{height: 48, width: 48, alignItems: "center", justifyContent: "center"}}><Feather name={rtl ? "arrow-right" : "arrow-left"} size={20} color={colors.bronze}/></Pressable> : <BrandMark size={28}/>}<Text style={styles.wordmark}>BONYAN</Text></View><View style={[styles.brand, rtl && styles.reverse]}><NotificationBell arabic={rtl} count={requiresActionCount} onPress={() => router.push("/notifications")}/>{showProfile ? <ProfileAvatar accessibilityLabel={t("profile")} displayName={profile.data?.display_name} hasPhoto={profile.data?.has_profile_photo} photoUpdatedAt={profile.data?.profile_photo_updated_at} onPress={() => router.push("/profile")} size={40}/> : null}{!rtl ? infoControl : null}</View></View><View style={{gap: 4}}><Text accessibilityRole="header" style={[styles.title, rtl && {lineHeight: 42}]}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View></View>;
}
const styles = StyleSheet.create({row: {flexDirection: "row", alignItems: "center", justifyContent: "space-between"}, brand: {flexDirection: "row", alignItems: "center", gap: 10}, reverse: {flexDirection: "row-reverse"}, wordmark: {color: colors.text, fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 3}, title: {color: colors.text, fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 34}, subtitle: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13, lineHeight: 20}});
