import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { SurfaceCard } from "../../core/components/SurfaceCard";
import { useLocale } from "../../core/i18n/LocaleProvider";
import { formatDate, formatNumber, type MessageKey } from "../../core/i18n/messages";
import { colors, fonts, radii, spacing } from "../../core/theme/tokens";
import { checkIn, getGameOverview, getProgressHistory, type Mission } from "./api";

const names: Record<Mission["category"], MessageKey> = {workout: "plannedWorkouts", nutrition: "nutritionHabits", recovery: "activeRecovery", checkin: "progressCheckin"};
export function GameScreen({mode = "missions"}: {mode?: "missions" | "progress"}) {
  const {t, locale} = useLocale(); const client = useQueryClient();
  const game = useQuery({queryKey: ["game", "overview"], queryFn: getGameOverview});
  const history = useQuery({queryKey: ["game", "progress-history"], queryFn: getProgressHistory, enabled: mode === "progress" && Boolean(game.data)});
  const record = useMutation({mutationFn: checkIn, onSuccess: value => {client.setQueryData(["game", "overview"], value); for(const key of ["game", "home", "activity"]) void client.invalidateQueries({queryKey: [key]});}});
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.back()}><Text style={styles.label}>{t("cancel")}</Text></Pressable>
    <Text style={styles.title}>{t(mode === "progress" ? "progressScore" : "weeklyMission")}</Text>
    {game.isPending ? <Text style={styles.copy}>{t("loading")}</Text> : game.isError ? <Pressable accessibilityRole="button" style={styles.button} onPress={() => void game.refetch()}><Text style={styles.label}>{t("request_failed")} · {t("retry")}</Text></Pressable> : game.data ? <>
      <SurfaceCard><Text style={styles.title}>{formatNumber(game.data.xp, locale)} {t("xp")} · {t("level")} {formatNumber(game.data.level, locale)}</Text><Text style={styles.copy}>{t("missionPoints")}: {formatNumber(game.data.mission_points, locale)}</Text><Text style={styles.copy}>{formatDate(`${game.data.week_start}T12:00:00Z`, locale, game.data.timezone)} → {formatDate(`${game.data.week_end}T12:00:00Z`, locale, game.data.timezone)}</Text></SurfaceCard>
      {mode === "progress" ? <SurfaceCard>
        <Text style={styles.title}>{game.data.progress_score.value === null ? "—" : formatNumber(game.data.progress_score.value, locale)} / {formatNumber(100, locale)}</Text>
        <Text style={styles.copy}>{t("coverage")}: {formatNumber(game.data.progress_score.coverage, locale)}%</Text>
        {!game.data.progress_score.ranked ? <Text style={styles.copy}>{t("insufficientCoverage")}</Text> : null}
        <Text style={styles.copy}>{t("progressExplanation")}</Text>
        {Object.entries(game.data.progress_score.weights).map(([key, weight]) => <View key={key} style={styles.row}><Text style={styles.copy}>{t(key === "training" ? "plannedWorkouts" : key === "personal_goal" ? "personalGoal" : key === "recovery" ? "activeRecovery" : "nutritionHabits")} · {formatNumber(weight, locale)}%</Text><Text style={styles.label}>{game.data!.progress_score.dimensions[key] == null ? t("unknown") : formatNumber(game.data!.progress_score.dimensions[key]!, locale)}</Text></View>)}
      </SurfaceCard> : game.data.missions.map(mission => <SurfaceCard key={mission.category}><Text style={styles.title}>{t(names[mission.category])}</Text><Text style={styles.copy}>{formatNumber(mission.completed, locale)} / {formatNumber(mission.target, locale)} · {formatNumber(mission.points, locale)} / {formatNumber(mission.maximum, locale)} {t("missionPoints")}</Text>{mission.category === "recovery" || mission.category === "checkin" ? <Pressable accessibilityRole="button" disabled={record.isPending || mission.completed >= mission.target} style={styles.button} onPress={() => record.mutate(mission.category as "recovery" | "checkin")}><Text style={styles.label}>{t(mission.category === "recovery" ? "recordRecovery" : "recordCheckin")}</Text></Pressable> : null}</SurfaceCard>)}
      <Text style={styles.copy}>{t("missionRules")}</Text>
      {mode === "progress" ? <><Text style={styles.title}>{t("activity")}</Text>{history.isError ? <Pressable accessibilityRole="button" style={styles.button} onPress={() => void history.refetch()}><Text style={styles.label}>{t("retry")}</Text></Pressable> : history.data?.map(snapshot => <View key={snapshot.id} style={styles.row}><Text style={styles.copy}>{formatDate(snapshot.created_at, locale, game.data!.timezone)}</Text><Text style={styles.label}>{snapshot.result.value === null ? t("unknown") : formatNumber(snapshot.result.value, locale)} · {t("coverage")}: {formatNumber(snapshot.result.coverage, locale)}%</Text></View>)}</> : null}
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push(mode === "progress" ? "/missions" : "/progress-score")}><Text style={styles.label}>{t(mode === "progress" ? "weeklyMission" : "progressScore")}</Text></Pressable>
    </> : null}
    {record.error ? <Text accessibilityRole="alert" style={styles.copy}>{record.error.message}</Text> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({page: {backgroundColor: colors.canvas, flex: 1}, content: {padding: spacing.lg, gap: spacing.md}, title: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 22}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 22}, label: {color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14}, button: {minHeight: 50, borderWidth: 1, borderColor: colors.bronzeBorder, borderRadius: radii.control, padding: spacing.sm, justifyContent: "center"}, row: {flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm}});
