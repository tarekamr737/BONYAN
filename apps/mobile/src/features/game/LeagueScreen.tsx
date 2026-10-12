import Feather from "@expo/vector-icons/Feather";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Image} from "expo-image";
import {router} from "expo-router";
import {useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {FeatureHeader} from "../../core/components/FeatureHeader";
import {DirectionalText as Text} from "../../core/components/DirectionalText";
import {useLocale} from "../../core/i18n/LocaleProvider";
import {formatDate, formatNumber, remainingDaysLabel, type MessageKey} from "../../core/i18n/messages";
import {estimatedServerTime} from "../../core/api/serverClock";
import {colors, fonts} from "../../core/theme/tokens";
import {CoachingPage} from "../auth/components/CoachingUI";
import {getGameOverview, getLeague, setLeagueParticipation, type LeagueEntry, type LeagueMode} from "./api";
import {Action, QueryNotice} from "./GamePage";
import {MissionRows} from "./MissionRows";

export function LeagueScreen() {
  const {t, locale, rtl} = useLocale(); const client = useQueryClient(); const [mode, setMode] = useState<LeagueMode>("weekly");
  const league = useQuery({queryKey: ["game", "league", mode], queryFn: () => getLeague(mode)});
  const game = useQuery({queryKey: ["game", "overview"], queryFn: getGameOverview});
  const participation = useMutation({mutationFn: setLeagueParticipation, onSuccess: () => void client.invalidateQueries({queryKey: ["game"]})});
  const leaders = league.data?.participants.filter(entry => entry.rank !== null && entry.rank <= 3) ?? [];
  const podium = [2, 1, 3].flatMap(rank => leaders.filter(entry => entry.rank === rank));
  const otherMembers = league.data?.participants.filter(entry => entry.rank === null || entry.rank > 3) ?? [];
  const memberName = (entry: LeagueEntry) => (entry.display_name === "BONYAN member" ? t("communityMember") : entry.display_name) + (entry.is_me ? " · " + t("you") : "");
  const row = [styles.row, rtl && styles.reverse];
  return <CoachingPage arabic={rtl} contentStyle={{padding: 16, gap: 16}}>
    <FeatureHeader title={t("league")} subtitle={t("leagueSubtitle")}/>
    <View style={row}>{(["weekly", "all_time", "friends"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{selected: value === mode}} onPress={() => setMode(value)} style={[styles.tab, value === mode && styles.tabActive]}><Text style={[styles.tabText, value === mode && {color: colors.canvas}]}>{t(value === "all_time" ? "allTime" : value)}</Text></Pressable>)}</View>
    <QueryNotice pending={league.isPending} error={league.error} retry={() => void league.refetch()}/>
    {league.data ? <>
      <View style={[row, styles.banner]}><Feather name="award" size={32} color={colors.bronze}/><View style={{flex: 1, gap: 4}}><Text style={styles.heading}>{t("consistencyLeague")}</Text><Text style={styles.small}>{t("earnThroughProgress")}</Text></View><View style={{gap: 4}}><Feather name="clock" size={15} color={colors.mutedLight}/><Text style={styles.small}>{remainingDaysLabel(league.data.season.ends_at + "T00:00:00Z", estimatedServerTime(), locale)}</Text></View></View>
      {!league.data.opted_in ? <><Text style={styles.small}>{t("leaguePrivacy")}</Text><Action disabled={participation.isPending} label={t("joinLeague")} onPress={() => participation.mutate(true)}/></> : null}
      {podium.length ? <View style={[row, styles.podium]}>{podium.map(entry => <View key={entry.rank} style={[styles.podiumMember, entry.rank === 1 && {paddingBottom: 16}]}><View style={[styles.medal, entry.rank === 1 && {backgroundColor: colors.bronze}]}><Text style={[styles.heading, entry.rank === 1 && {color: colors.canvas}]}>{formatNumber(entry.rank!, locale)}</Text></View><View style={[styles.portrait, entry.rank === 1 && {height: 144, borderColor: colors.bronze}]}>{entry.avatar_url ? <Image accessibilityLabel={memberName(entry)} source={{uri: entry.avatar_url}} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill}/> : <Feather name="user" size={48} color={colors.mutedLight}/>}</View><Text numberOfLines={2} style={styles.member}>{memberName(entry)}</Text><Text style={[styles.points, entry.is_me && {color: colors.bronze}]}>{formatNumber(entry.points, locale)}</Text><Text style={styles.small}>{t("missionPoints")}</Text></View>)}</View> : <View style={styles.emptyPodium}><View style={row}>{[0, 1, 2].map(index => <View key={index} style={[styles.emptyPortrait, index === 1 && {height: 106}]}><Feather name="user" size={32} color={colors.muted}/></View>)}</View><Text style={styles.heading}>{t("podiumEmpty")}</Text><Text style={[styles.copy, {textAlign: "center"}]}>{t("noRankedMembers")}</Text></View>}
      <View style={[row, styles.rank]}><Feather name="award" size={24} color={colors.bronze}/><View style={{flex: 1, gap: 4}}><Text style={styles.small}>{t("rank")}</Text><Text style={styles.heading}>{league.data.personal_rank === null ? t("unranked") : "#" + formatNumber(league.data.personal_rank, locale)}</Text></View></View>
      {otherMembers.map((entry, index) => <View key={index} style={styles.memberRow}><View style={row}><Text style={styles.heading}>{entry.rank === null ? "—" : formatNumber(entry.rank, locale)}</Text>{entry.avatar_url ? <Image source={{uri: entry.avatar_url}} accessibilityLabel={memberName(entry)} cachePolicy="none" style={styles.memberAvatar}/> : <Feather name="user" size={22} color={colors.mutedLight}/>}<Text style={[styles.copy, {flex: 1}]}>{memberName(entry)}</Text><Text style={styles.heading}>{formatNumber(entry.points, locale)}</Text></View>{entry.badges?.length ? <Text style={styles.small}>{entry.badges.map(badge => t(badge as MessageKey)).join(" · ")}</Text> : null}{entry.progress_score !== null ? <Text style={styles.small}>{t("progressScore")}: {formatNumber(entry.progress_score, locale)}</Text> : null}</View>)}
      <View style={styles.missions}><View style={row}><Text style={[styles.heading, {flex: 1}]}>{t("weeklyMission")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("viewMissions")} onPress={() => router.push("/missions")} style={styles.smallAction}><Feather name={rtl ? "arrow-left" : "arrow-right"} size={20} color={colors.bronze}/></Pressable></View><Text style={styles.small}>{t("missionHelp")}</Text>{game.data ? <MissionRows missions={game.data.missions}/> : <QueryNotice pending={game.isPending} error={game.error} retry={() => void game.refetch()}/>}</View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/rewards")} style={[row, styles.reward]}><Feather name="award" size={30} color={colors.bronze}/><View style={{flex: 1, gap: 4}}><Text style={styles.heading}>{t("rewards")}</Text><Text style={styles.small}>{t("characterEvidence")}</Text></View><Feather name={rtl ? "chevron-left" : "chevron-right"} size={20} color={colors.bronze}/></Pressable>
      {league.data.opted_in ? <><Text style={styles.small}>{t("leaguePrivacy")}</Text><Action disabled={participation.isPending} label={t("leaveLeague")} onPress={() => participation.mutate(false)}/></> : null}
      <Text style={styles.small}>{t("weekEnds")}: {formatDate(league.data.week_end + "T12:00:00Z", locale, "UTC")} · {t("seasonEnds")}: {formatDate(league.data.season.ends_at + "T12:00:00Z", locale, "UTC")}</Text>
    </> : null}
    {participation.error ? <Text accessibilityRole="alert" style={styles.copy}>{participation.error.message}</Text> : null}
    <Action label={t("inviteFriends")} onPress={() => router.push("/challenges")}/>
    <Action label={t("privacySettings")} onPress={() => router.push("/privacy")}/>
  </CoachingPage>;
}
const styles = StyleSheet.create({
  row: {flexDirection: "row", alignItems: "center", gap: 10}, reverse: {flexDirection: "row-reverse"},
  tab: {flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line},
  tabActive: {backgroundColor: colors.bronze, borderColor: colors.bronze}, tabText: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12},
  banner: {borderWidth: 1, borderColor: colors.bronzeBorder, borderRadius: 16, backgroundColor: colors.surface, padding: 12},
  heading: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 21},
  small: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 10, lineHeight: 16},
  copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13, lineHeight: 20},
  podium: {alignItems: "flex-end", justifyContent: "center", gap: 8, paddingTop: 4},
  podiumMember: {flex: 1, minWidth: 0, alignItems: "center", gap: 8}, medal: {height: 32, width: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.bronzeBorder, justifyContent: "center", alignItems: "center"},
  portrait: {height: 122, width: "100%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center"},
  member: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16, textAlign: "center"},
  points: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 26}, emptyPodium: {alignItems: "center", gap: 12, paddingVertical: 12},
  emptyPortrait: {height: 84, width: 74, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center"},
  rank: {paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line},
  memberRow: {paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line}, memberAvatar: {height: 36, width: 36, borderRadius: 18},
  missions: {padding: 16, gap: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line},
  smallAction: {height: 48, width: 48, justifyContent: "center", alignItems: "center"},
  reward: {padding: 12, minHeight: 90, borderRadius: 16, borderWidth: 1, borderColor: colors.bronzeBorder, backgroundColor: colors.surface},
});
