import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors, fonts } from "../../core/theme/tokens";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { useLocale } from "../../core/i18n/LocaleProvider";
import { formatDate, formatNumber, remainingDaysLabel, type MessageKey } from "../../core/i18n/messages";
import {estimatedServerTime} from "../../core/api/serverClock";
import { getLeague, setLeagueParticipation, type LeagueMode } from "./api";
import { Action, GamePage, gameStyles as styles, QueryNotice } from "./GamePage";

export function LeagueScreen() {
  const {t, locale} = useLocale(); const client = useQueryClient(); const [mode, setMode] = useState<LeagueMode>("weekly");
  const league = useQuery({queryKey: ["game", "league", mode], queryFn: () => getLeague(mode)});
  const participation = useMutation({mutationFn: setLeagueParticipation, onSuccess: () => void client.invalidateQueries({queryKey: ["game"]})});
  const leaders = league.data?.participants.filter(entry => entry.rank !== null && entry.rank <= 3) ?? [];
  const otherMembers = league.data?.participants.filter(entry => entry.rank === null || entry.rank > 3) ?? [];
  const memberName = (entry: {display_name: string; is_me: boolean}) => `${entry.display_name === "BONYAN member" ? t("communityMember") : entry.display_name}${entry.is_me ? ` · ${t("you")}` : ""}`;
  return <GamePage title={t("league")}>
    <View style={styles.row}>{(["weekly", "friends", "all_time"] as const).map(value => <Action key={value} label={t(value === "all_time" ? "allTime" : value)} selected={value === mode} onPress={() => setMode(value)}/>)}</View>
    <QueryNotice pending={league.isPending} error={league.error} retry={() => void league.refetch()}/>
    {league.data ? <>
      <Text style={styles.copy}>{t("seasonEnds")}: {formatDate(`${league.data.season.ends_at}T12:00:00Z`, locale, "UTC")}</Text>
      <Text style={styles.copy}>{remainingDaysLabel(`${league.data.season.ends_at}T00:00:00Z`, estimatedServerTime(), locale)}</Text>
      <Text style={styles.copy}>{t("weekEnds")}: {formatDate(`${league.data.week_end}T12:00:00Z`, locale, "UTC")}</Text>
      <Text style={styles.copy}>{t("rank")}: {league.data.personal_rank === null ? t("unranked") : formatNumber(league.data.personal_rank, locale)}</Text>
      <Text style={styles.copy}>{t("leaguePrivacy")}</Text>
      <Action disabled={participation.isPending} label={t(league.data.opted_in ? "leaveLeague" : "joinLeague")} onPress={() => participation.mutate(!league.data!.opted_in)}/>
      {leaders.length ? <><Text style={styles.title}>{t("topThree")}</Text><View style={{flexDirection: locale === "ar-EG" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end"}}>{leaders.map(entry => <View key={entry.rank} style={{flex: 1, minWidth: 0, alignItems: "center", gap: 8, paddingVertical: entry.rank === 1 ? 20 : 12, paddingHorizontal: 4, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: entry.rank === 1 ? colors.bronze : colors.line}}><Text style={{color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 24}}>{formatNumber(entry.rank!, locale)}</Text>{entry.avatar_url ? <Image accessibilityLabel={memberName(entry)} source={{uri: entry.avatar_url}} cachePolicy="none" style={{width: 64, height: 84, borderRadius: 16}}/> : <View style={{width: 64, height: 84, alignItems: "center", justifyContent: "center"}}><Feather name="user" color={colors.mutedLight} size={32}/></View>}<Text style={[styles.copy, {textAlign: "center", fontSize: 12}]}>{memberName(entry)}</Text><Text style={[styles.copy, {color: colors.bronze}]}>{formatNumber(entry.points, locale)}</Text><Text style={[styles.copy, {fontSize: 11, textAlign: "center"}]}>{t("missionPoints")}</Text>{entry.badges?.map(badge => <Text key={badge} style={[styles.copy, {fontSize: 11, textAlign: "center"}]}>{t(badge as MessageKey)}</Text>)}</View>)}</View></> : null}
      {!league.data.participants.length ? <Text style={styles.copy}>{t("noParticipants")}</Text> : otherMembers.map((entry, index) => <View key={`${entry.rank}-${index}`} style={{borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 16, gap: 8}}><View style={styles.row}>{entry.avatar_url ? <Image accessibilityLabel={memberName(entry)} source={{uri: entry.avatar_url}} cachePolicy="none" style={styles.image}/> : null}<Text style={[styles.copy, {flex: 1}]}>{entry.rank === null ? "—" : formatNumber(entry.rank, locale)} · {memberName(entry)}</Text><Text style={styles.copy}>{formatNumber(entry.points, locale)} {t("missionPoints")}</Text></View>{entry.badges?.length ? <Text style={styles.copy}>{entry.badges.map(badge => t(badge as MessageKey)).join(" · ")}</Text> : null}{entry.unranked_reason ? <Text style={styles.copy}>{t("unranked")}</Text> : null}{entry.progress_score !== null ? <Text style={styles.copy}>{t("progressScore")}: {formatNumber(entry.progress_score, locale)}</Text> : null}</View>)}
    </> : null}
    {participation.error ? <Text accessibilityRole="alert" style={styles.copy}>{participation.error.message}</Text> : null}
    <Action label={t("inviteFriends")} onPress={() => router.push("/challenges")}/><Action label={t("rewards")} onPress={() => router.push("/rewards")}/><Action label={t("privacySettings")} onPress={() => router.push("/privacy")}/>
  </GamePage>;
}
