import {visibleProgressValue} from "../../features/game/progress";
import {exerciseCount, workoutDayLabel} from "../i18n/fitness";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { CoachingPage, ProgressMeter, ui } from "../../features/auth/components/CoachingUI";
import { getGameOverview, getLeague, getProgressHistory } from "../../features/game/api";
import { getDailyDashboard } from "../../features/nutrition/api";
import { getWorkoutSessions, startWorkoutSession } from "../../features/training/api/trainingApi";
import { planNeedsRefresh } from "../../features/training/planIntegrity";
import { ExerciseMedia } from "../../features/training/components/ExerciseMedia";
import { AppButton, BrandMark, NotificationBell, ProfileAvatar } from "../components";
import { DirectionalText as Text } from "../components/DirectionalText";
import { SurfaceCard } from "../components/SurfaceCard";
import { useLocale } from "../i18n/LocaleProvider";
import { formatNumber } from "../i18n/messages";
import { useAppNotifications } from "../notifications/useAppNotifications";
import { colors, fonts, spacing } from "../theme/tokens";
import { useHomeTour } from "../tour/HomeTour";
import { nextWorkout, progressChange } from "./todayState";

export function HomeScreen() {
  const {t, locale, rtl} = useLocale();
  const state = useAppNotifications(); const {profile, plan, avatars} = state;
  const client = useQueryClient();
  const game = useQuery({queryKey: ["game", "overview"], queryFn: getGameOverview});
  const history = useQuery({queryKey: ["game", "progress-history"], queryFn: getProgressHistory, enabled: Boolean(game.data)});
  const league = useQuery({queryKey: ["game", "league", "weekly"], queryFn: () => getLeague("weekly"), enabled: Boolean(game.data?.league_opt_in)});
  const daily = useQuery({queryKey: ["nutrition", "today"], queryFn: getDailyDashboard});
  const sessions = useQuery({queryKey: ["training", "sessions", "home"], queryFn: () => getWorkoutSessions(50)});
  const next = nextWorkout(planNeedsRefresh(plan.data) ? null : plan.data, sessions.data ?? []);
  const {registerTarget, setHomeScroller} = useHomeTour();
  const profileRef = useRef<View>(null); const planRef = useRef<View>(null); const scoreRef = useRef<View>(null);
  const start = useMutation({mutationFn: () => startWorkoutSession(plan.data!.id, next.day!.key), onSuccess: session => {
    void client.invalidateQueries({queryKey: ["training", "sessions"]});
    router.push({pathname: "/training/day", params: {sessionId: session.id, dayKey: session.day_key}});
  }});
  const avatar = avatars.data?.items.find(item => item.approved) ?? avatars.data?.items[0];
  const delta = game.data ? progressChange(game.data.progress_score, history.data ?? []) : null;
  const workoutMission = game.data?.missions.find(item => item.category === "workout");
  const row = [styles.row, rtl && styles.reverse];
  const ready = !sessions.isPending && !sessions.isError && !plan.isPending && !plan.isError;
  return <CoachingPage arabic={rtl} onScrollViewRef={setHomeScroller} contentStyle={{padding: 16, paddingBottom: 48, gap: 16}}>
    <View style={[styles.header, rtl && styles.reverse]}><BrandMark size={48}/><View style={styles.row}>
      <NotificationBell arabic={rtl} count={state.requiresActionCount} onPress={() => router.push("/notifications")}/>
      <View ref={profileRef} onLayout={() => registerTarget("profile", profileRef.current, 0)}><ProfileAvatar accessibilityLabel={t("profile")} displayName={profile.data?.display_name} hasPhoto={profile.data?.has_profile_photo} photoUpdatedAt={profile.data?.profile_photo_updated_at} onPress={() => router.push("/profile")} size={50}/></View>
    </View></View>
    <View style={{gap: 8}}><Text style={ui.small}>{t("greeting")}{profile.data?.display_name ? `, ${profile.data.display_name}` : ""}</Text><Text accessibilityRole="header" style={ui.title}>{t("today")}</Text><Text style={ui.text}>{t("todaySubtitle")}</Text></View>
    <View ref={planRef} onLayout={event => registerTarget("today-plan", planRef.current, event.nativeEvent.layout.y)}><SurfaceCard style={{gap: 12, padding: 16}}>
      <Text style={styles.eyebrow}>{t("nextMove")}</Text>
      {next.day ? <View style={row}><ExerciseMedia exerciseId={next.day.prescriptions[0]?.exercise_id ?? ""} name={next.day.prescriptions[0]?.name ?? t("train")} arabic={rtl} compact/><View style={styles.flex}><Text style={ui.heading}>{workoutDayLabel(next.day.name, rtl)}</Text><Text style={ui.small}>{exerciseCount(next.day.prescriptions.length, locale)} · {formatNumber(next.day.estimated_minutes, locale)} {t("minutes")}</Text></View></View> : <Text style={ui.text}>{t("noReadyWorkout")}</Text>}
      {!ready && !sessions.isError && !plan.isError ? <ActivityIndicator color={colors.bronze}/> : null}
      {sessions.isError || plan.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void Promise.all([sessions.refetch(), plan.refetch()])}/> : <AppButton disabled={!ready} loading={start.isPending} label={t(next.active ? "resumeWorkout" : next.day ? "startWorkout" : "prepareWorkout")} onPress={() => next.active ? router.push({pathname: "/training/day", params: {sessionId: next.active.id, dayKey: next.active.day_key}}) : next.day ? start.mutate() : router.push("/training")}/>}
      {start.error ? <Text accessibilityRole="alert" style={ui.error}>{start.error.message}</Text> : null}
    </SurfaceCard></View>
    <SurfaceCard style={styles.stack}><View style={row}><Text style={[ui.heading, styles.flex]}>{t("yourProgress")}</Text>{game.data ? <Text style={ui.small}>{t("level")} {formatNumber(game.data.level, locale)}</Text> : null}</View>
      {game.isPending ? <ActivityIndicator color={colors.bronze}/> : null}
      {game.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void game.refetch()}/> : null}
      {game.data ? <><View style={row}><View style={styles.flex}><Text style={ui.small}>{t("progressScore")}</Text><Text style={styles.score}>{visibleProgressValue(game.data.progress_score) === null ? "—" : formatNumber(visibleProgressValue(game.data.progress_score)!, locale)}<Text style={ui.small}> / {formatNumber(100, locale)}</Text></Text></View><View style={styles.flex}><Text style={ui.small}>{t("xp")}</Text><Text style={styles.score}>{formatNumber(game.data.xp, locale)}</Text></View></View>
      <ProgressMeter label={t("xp")} value={game.data.xp % 100}/><Text style={ui.small}>{delta === null ? t("noProgressTrend") : `${t("progressTrend")}: ${delta > 0 ? "+" : ""}${formatNumber(delta, locale)}`}</Text>
      {!game.data.progress_score.ranked ? <Text style={ui.small}>{t("insufficientCoverage")}</Text> : null}<AppButton label={t("progressScore")} variant="secondary" onPress={() => router.push("/progress-score")}/></> : null}
    </SurfaceCard>
    <SurfaceCard style={styles.stack}><View style={row}>
      <View style={styles.preview}>{avatar?.preview_url ? <Image source={{uri: avatar.preview_url}} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill}/> : <Text style={styles.score}>◇</Text>}</View><View style={styles.flex}><Text style={ui.heading}>{t("yourAvatar")}</Text><Text style={ui.small}>{t(avatar ? avatar.approved ? "illustration" : "avatarPending" : "avatarSetup")}</Text></View>
    </View><AppButton label={t("viewAvatar")} variant="secondary" onPress={() => router.push("/avatar")}/></SurfaceCard>
    <SurfaceCard style={styles.stack}><Text style={ui.heading}>{t("weeklyMission")}</Text>{workoutMission ? <><Text style={ui.text}>{formatNumber(workoutMission.completed, locale)} / {formatNumber(workoutMission.target, locale)} · {t("plannedWorkouts")}</Text><ProgressMeter label={t("plannedWorkouts")} value={100 * workoutMission.completed / workoutMission.target}/></> : null}<AppButton label={t("viewMissions")} variant="secondary" onPress={() => router.push("/missions")}/></SurfaceCard>
    <SurfaceCard style={styles.stack}><Text style={ui.heading}>{t("league")}</Text>{game.data?.league_opt_in ? <Text style={ui.text}>{t("rank")}: {league.data?.personal_rank == null ? t("unranked") : formatNumber(league.data.personal_rank, locale)}</Text> : <Text style={ui.small}>{t("leaguePrivacy")}</Text>}<AppButton label={t(game.data?.league_opt_in ? "league" : "joinLeague")} variant="secondary" onPress={() => router.push("/league")}/></SurfaceCard>
    <SurfaceCard style={styles.stack}><Text style={ui.heading}>{t("coach")}</Text><Text style={ui.text}>{t("coachTodayHelp")}</Text><AppButton label={t("askCoach")} onPress={() => router.push("/training/coach")}/></SurfaceCard>
    <View ref={scoreRef} onLayout={event => registerTarget("daily-score", scoreRef.current, event.nativeEvent.layout.y)} style={styles.stack}><Text style={ui.heading}>{t("dailyScore")}: {daily.data ? `${formatNumber(daily.data.score, locale)} / ${formatNumber(100, locale)}` : "—"}</Text><Text style={ui.small}>{t("dailyScoreHelp")}</Text>{daily.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void daily.refetch()}/> : null}</View>
  </CoachingPage>;
}
const styles = StyleSheet.create({header: {alignItems: "center", flexDirection: "row", justifyContent: "space-between"}, row: {alignItems: "center", flexDirection: "row", gap: spacing.md}, reverse: {flexDirection: "row-reverse"}, stack: {gap: spacing.md}, flex: {flex: 1, gap: spacing.xs, minWidth: 0}, eyebrow: {color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 12}, score: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 32}, preview: {width: 84, height: 112, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center"}});
