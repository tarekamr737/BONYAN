import Feather from "@expo/vector-icons/Feather";
import {Image} from "expo-image";
import {Pressable, StyleSheet, View} from "react-native";
import {router} from "expo-router";
import {DirectionalText as Text} from "../../../core/components/DirectionalText";
import {ProgressRing} from "../../../core/components/ProgressRing";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {formatDate, formatNumber, type MessageKey} from "../../../core/i18n/messages";
import {colors, fonts} from "../../../core/theme/tokens";
import type {GameOverview} from "../../game/api";
import {visibleProgressValue} from "../../game/progress";
import type {AvatarView} from "../types";

export function PrivateAvatarHero({avatar, recordedAt, game}: {avatar?: AvatarView; recordedAt?: string | null; game?: GameOverview}) {
  const {t, locale, rtl} = useLocale(); const score = game ? visibleProgressValue(game.progress_score) : null;
  return <View style={{gap: 12}}><View style={{flexDirection: rtl ? "row-reverse" : "row", alignItems: "stretch", gap: 12}}>
    <View style={styles.figure}>{avatar?.preview_url ? <Image accessibilityLabel={t("yourAvatar")} source={{uri: avatar.preview_url}} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill}/> : <View style={{alignItems: "center", gap: 16}}><Feather name="user" size={100} color={colors.mutedLight}/><Text style={[styles.small, {textAlign: "center"}]}>{t("avatarSetup")}</Text></View>}</View>
    <View style={styles.sidebar}><View style={styles.metric}><Text style={styles.small}>{t("progressScore")}</Text><ProgressRing value={score} size={56}/><Text style={styles.value}>{score === null ? "—" : formatNumber(score, locale)}<Text style={styles.small}> / {formatNumber(100, locale)}</Text></Text></View>
      <View style={styles.metric}><Feather name="activity" size={18} color={colors.bronze}/><Text style={styles.small}>{t("bodyProfile")}</Text><Text style={styles.small}>{recordedAt ? formatDate(recordedAt, locale, game?.timezone ?? "UTC") : t("unknown")}</Text></View>
      <View style={styles.metric}><Feather name="award" size={18} color={colors.bronze}/><Text style={styles.small}>{t("level")} {game ? formatNumber(game.level, locale) : "—"}</Text><Text style={styles.value}>{game ? formatNumber(game.xp, locale) : "—"}</Text><Text style={styles.small}>{t("xp")}</Text></View>
    </View>
  </View><Text style={styles.small}>{t("illustration")}</Text><View style={{flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12}}><Text style={[styles.small, {flex: 1}]}>{game?.badges.length ? game.badges.map(badge => t(badge as MessageKey)).join(" · ") : t("noBadges")}</Text><Pressable accessibilityRole="button" onPress={() => router.push("/missions")} style={{minHeight: 48, justifyContent: "center"}}><Text style={[styles.small, {color: colors.bronze}]}>{t("weeklyMission")}</Text></Pressable></View></View>;
}
const styles = StyleSheet.create({figure: {flex: 1, minWidth: 0, minHeight: 300, backgroundColor: colors.surface, borderRadius: 24, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden"}, sidebar: {width: 112, gap: 8}, metric: {gap: 6, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 10, borderRadius: 16}, small: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 11, lineHeight: 17}, value: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 22, lineHeight: 30}});
