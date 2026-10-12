import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { formatNumber } from "../../../core/i18n/messages";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { getWorkoutSessions } from "../api/trainingApi";
import {getMyProfile} from "../../auth/api/profileApi";
import {weightLabel} from "../../../core/i18n/fitness";
import {AppButton} from "../../../core/components";
import {estimatedServerTime} from "../../../core/api/serverClock";
import type { ExercisePrescription, WorkoutSession } from "../types";

export function WorkoutRecovery({session, exercise, index, showHistory = true}: {session: WorkoutSession | null; exercise: ExercisePrescription; index: number; showHistory?: boolean}) {
  const {t, locale} = useLocale();
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const [now, setNow] = useState(0);
  useEffect(() => {const timer = setInterval(() => setNow(estimatedServerTime() ?? 0), 1000); return () => clearInterval(timer);}, []);
  const history = useQuery({queryKey: ["training", "sessions", "performance"], queryFn: () => getWorkoutSessions(50), enabled: showHistory});
  const previous = history.data?.find(item => item.status === "completed" && item.id !== session?.id && item.logged_sets.some(set => set.exercise_id === exercise.exercise_id));
  const sets = previous?.logged_sets.filter(set => set.exercise_id === exercise.exercise_id) ?? [];
  const last = session?.logged_sets.filter(set => set.prescription_index === index && set.logged_at).at(-1);
  const remaining = last?.logged_at ? Math.min(exercise.rest_seconds, Math.max(0, Math.ceil((Date.parse(last.logged_at) + exercise.rest_seconds * 1000 - now) / 1000))) : 0;
  return <View style={styles.container}>
    {last && now > 0 ? <Text style={styles.copy}>{remaining > 0 ? `${t("restTimer")}: ${formatNumber(remaining, locale)} ${t("seconds")}` : t("restReady")}</Text> : null}
    {showHistory ? <><Text style={styles.copy}>{t("previousPerformance")}</Text>
    <Text style={styles.copy}>{sets.length ? sets.map(set => `${formatNumber(set.reps, locale)} × ${weightLabel(set.weight_kg, locale, profile.data?.preferred_units === "imperial")}`).join(" · ") : history.isPending ? t("loading") : history.isError ? t("request_failed") : t("noPreviousPerformance")}</Text>
    {history.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void history.refetch()}/> : null}</> : null}
  </View>;
}
const styles = StyleSheet.create({container: {gap: spacing.sm, marginTop: spacing.md}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 22}});
