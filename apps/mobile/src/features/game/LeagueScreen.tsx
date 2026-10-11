import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { SurfaceCard } from "../../core/components/SurfaceCard";
import { useLocale } from "../../core/i18n/LocaleProvider";
import { formatDate, formatNumber } from "../../core/i18n/messages";
import { getLeague, setLeagueParticipation, type LeagueMode } from "./api";
import { Action, GamePage, gameStyles as styles, QueryNotice } from "./GamePage";

export function LeagueScreen() {
  const {t, locale} = useLocale(); const client = useQueryClient(); const [mode, setMode] = useState<LeagueMode>("weekly");
  const league = useQuery({queryKey: ["game", "league", mode], queryFn: () => getLeague(mode)});
  const participation = useMutation({mutationFn: setLeagueParticipation, onSuccess: () => void client.invalidateQueries({queryKey: ["game"]})});
  return <GamePage title={t("league")}>
    <View style={styles.row}>{(["weekly", "friends", "all_time"] as const).map(value => <Action key={value} label={t(value === "all_time" ? "allTime" : value)} selected={value === mode} onPress={() => setMode(value)}/>)}</View>
    <QueryNotice pending={league.isPending} error={league.error} retry={() => void league.refetch()}/>
    {league.data ? <>
      <Text style={styles.copy}>{t("seasonEnds")}: {formatDate(`${league.data.season.ends_at}T12:00:00Z`, locale, "UTC")}</Text>
      <Text style={styles.copy}>{t("rank")}: {league.data.personal_rank === null ? t("unranked") : formatNumber(league.data.personal_rank, locale)}</Text>
      <Text style={styles.copy}>{t("leaguePrivacy")}</Text>
      <Action disabled={participation.isPending} label={t(league.data.opted_in ? "leaveLeague" : "joinLeague")} onPress={() => participation.mutate(!league.data!.opted_in)}/>
      {!league.data.participants.length ? <Text style={styles.copy}>{t("noParticipants")}</Text> : league.data.participants.map((entry, index) => <SurfaceCard key={`${entry.rank}-${index}`}><View style={styles.row}>{entry.avatar_url ? <Image accessibilityLabel={entry.display_name} source={{uri: entry.avatar_url}} cachePolicy="none" style={styles.image}/> : null}<Text style={styles.title}>{entry.rank === null ? "—" : formatNumber(entry.rank, locale)} · {entry.display_name === "BONYAN member" ? t("communityMember") : entry.display_name}{entry.is_me ? ` · ${t("you")}` : ""}</Text></View><Text style={styles.copy}>{formatNumber(entry.points, locale)} {t("missionPoints")}</Text>{entry.unranked_reason ? <Text style={styles.copy}>{t("unranked")}</Text> : null}{entry.progress_score !== null ? <Text style={styles.copy}>{t("progressScore")}: {formatNumber(entry.progress_score, locale)}</Text> : null}</SurfaceCard>)}
    </> : null}
    {participation.error ? <Text accessibilityRole="alert" style={styles.copy}>{participation.error.message}</Text> : null}
    <Action label={t("inviteFriends")} onPress={() => router.push("/challenges")}/><Action label={t("rewards")} onPress={() => router.push("/rewards")}/><Action label={t("privacySettings")} onPress={() => router.push("/privacy")}/>
  </GamePage>;
}
