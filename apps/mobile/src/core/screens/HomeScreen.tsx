import Feather from "@expo/vector-icons/Feather";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Image} from "expo-image";
import {router} from "expo-router";
import {useRef} from "react";
import {ActivityIndicator, Pressable, StyleSheet, View} from "react-native";
import {CoachingPage, ProgressMeter, ui} from "../../features/auth/components/CoachingUI";
import {getGameOverview, getLeague, getProgressHistory} from "../../features/game/api";
import {visibleProgressValue} from "../../features/game/progress";
import {getDailyDashboard} from "../../features/nutrition/api";
import {getWorkoutSessions, startWorkoutSession} from "../../features/training/api/trainingApi";
import {ExerciseMedia} from "../../features/training/components/ExerciseMedia";
import {planNeedsRefresh} from "../../features/training/planIntegrity";
import {AppButton, BrandMark, NotificationBell, ProfileAvatar} from "../components";
import {DirectionalText as Text} from "../components/DirectionalText";
import {ProgressRing} from "../components/ProgressRing";
import {SurfaceCard} from "../components/SurfaceCard";
import {useLocale} from "../i18n/LocaleProvider";
import {exerciseCount, fitnessLabel, workoutDayLabel} from "../i18n/fitness";
import {formatNumber} from "../i18n/messages";
import {useAppNotifications} from "../notifications/useAppNotifications";
import {colors, fonts} from "../theme/tokens";
import {useHomeTour} from "../tour/HomeTour";
import {nextWorkout, progressChange} from "./todayState";

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
  const score = game.data ? visibleProgressValue(game.data.progress_score) : null;
  const delta = game.data ? progressChange(game.data.progress_score, history.data ?? []) : null;
  const mission = game.data?.missions.find(item => item.category === "workout");
  const row = [styles.row, rtl && styles.reverse];
  const ready = !sessions.isPending && !sessions.isError && !plan.isPending && !plan.isError;
  return <CoachingPage arabic={rtl} onScrollViewRef={setHomeScroller} contentStyle={{padding: 16, paddingBottom: 24, gap: 12}}>
    <View style={[styles.header, rtl && styles.reverse]}><View style={row}><BrandMark size={32}/><Text style={styles.wordmark}>BONYAN</Text></View><View style={row}>
      <NotificationBell arabic={rtl} count={state.requiresActionCount} onPress={() => router.push("/notifications")}/>
      <View ref={profileRef} onLayout={() => registerTarget("profile", profileRef.current, 0)}><ProfileAvatar accessibilityLabel={t("profile")} displayName={profile.data?.display_name} hasPhoto={profile.data?.has_profile_photo} photoUpdatedAt={profile.data?.profile_photo_updated_at} onPress={() => router.push("/profile")} size={42}/></View>
    </View></View>
    <View style={{gap: 4}}><Text style={styles.small}>{t("greeting")}{profile.data?.display_name ? ", " + profile.data.display_name : ""}</Text><Text accessibilityRole="header" style={styles.title}>{t("today")}</Text><Text style={styles.copy}>{t("buildCharacter")}</Text></View>
    <View ref={planRef} onLayout={event => registerTarget("today-plan", planRef.current, event.nativeEvent.layout.y)}><SurfaceCard style={styles.card}>
      <Text style={styles.eyebrow}>{t("nextMove")}</Text>
      {next.day ? <View style={row}><View style={styles.flex}><Text style={styles.workout}>{workoutDayLabel(next.day.name, rtl)}</Text><Text style={styles.small}>{next.day.prescriptions[0]?.muscles.map(value => fitnessLabel(value, locale)).join(" · ")}</Text><View style={row}><Feather name="clock" size={13} color={colors.mutedLight}/><Text style={styles.small}>{exerciseCount(next.day.prescriptions.length, locale)} · {formatNumber(next.day.estimated_minutes, locale)} {t("minutes")}</Text></View></View><ExerciseMedia exerciseId={next.day.prescriptions[0]?.exercise_id ?? ""} name={next.day.prescriptions[0]?.name ?? t("train")} arabic={rtl} compact previewSize={94}/></View> : <Text style={styles.copy}>{t("noReadyWorkout")}</Text>}
      {!ready && !sessions.isError && !plan.isError ? <ActivityIndicator color={colors.bronze}/> : null}
      {sessions.isError || plan.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void Promise.all([sessions.refetch(), plan.refetch()])}/> : <AppButton disabled={!ready} loading={start.isPending} label={t(next.active ? "resumeWorkout" : next.day ? "startWorkout" : "prepareWorkout")} onPress={() => next.active ? router.push({pathname: "/training/day", params: {sessionId: next.active.id, dayKey: next.active.day_key}}) : next.day ? start.mutate() : router.push("/training")}/>}
      {start.error ? <Text accessibilityRole="alert" style={ui.error}>{start.error.message}</Text> : null}
    </SurfaceCard></View>
    <SurfaceCard style={styles.card}><View style={row}><Text style={[styles.eyebrow, styles.flex]}>{t("yourProgress")}</Text>{game.data ? <Text style={styles.small}>{t("level")} {formatNumber(game.data.level, locale)}</Text> : null}</View>
      {game.isPending ? <ActivityIndicator color={colors.bronze}/> : game.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void game.refetch()}/> : game.data ? <>
        <View style={row}><Pressable accessibilityRole="button" accessibilityLabel={t("progressScore")} onPress={() => router.push("/progress-score")} style={[styles.row, styles.flex, rtl && styles.reverse]}><ProgressRing value={score} size={66}/><View style={styles.flex}><Text style={styles.small}>{t("progressScore")}</Text><Text style={styles.value}>{score === null ? "—" : formatNumber(score, locale)}<Text style={styles.small}> / {formatNumber(100, locale)}</Text></Text></View></Pressable><View style={styles.xp}><Text style={styles.small}>{t("xp")}</Text><Text style={styles.value}>{formatNumber(game.data.xp, locale)}</Text><ProgressMeter label={t("nextLevel")} value={Math.min(100, Math.max(0, 100 * (game.data.xp - (game.data.next_level_xp - 100)) / 100))}/><Text style={styles.small}>{formatNumber(game.data.xp, locale)} / {formatNumber(game.data.next_level_xp, locale)}</Text></View></View>
        <View style={[row, styles.insight]}><Feather name={score === null ? "info" : "trending-up"} size={16} color={score === null ? colors.bronze : colors.positive}/><Text style={[styles.small, styles.flex]}>{score === null ? t("insufficientCoverage") : delta === null ? t("noProgressTrend") : t("progressTrend") + ": " + (delta > 0 ? "+" : "") + formatNumber(delta, locale)}</Text></View>
      </> : null}
    </SurfaceCard>
    <Pressable accessibilityRole="button" accessibilityLabel={t("viewAvatar")} onPress={() => router.push("/avatar")} style={[styles.avatarStrip, rtl && styles.reverse]}>
      <View style={styles.avatar}>{avatar?.preview_url ? <Image source={{uri: avatar.preview_url}} cachePolicy="none" contentFit="contain" style={StyleSheet.absoluteFill}/> : <Feather name="user" size={36} color={colors.mutedLight}/>}</View><View style={styles.flex}><Text style={styles.eyebrow}>{t("yourAvatar")}</Text><Text style={styles.small}>{t(avatar ? avatar.approved ? "illustration" : "avatarPending" : "avatarSetup")}</Text></View><Feather name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.bronze}/>
    </Pressable>
    <View style={[styles.tiles, rtl && styles.reverse]}>
      <Pressable accessibilityRole="button" onPress={() => router.push("/missions")} style={styles.tile}><Text style={styles.eyebrow}>{t("weeklyMission")}</Text><Text style={styles.value}>{mission ? formatNumber(mission.completed, locale) + " / " + formatNumber(mission.target, locale) : "—"}</Text><Text style={styles.small}>{t("plannedWorkouts")}</Text>{mission ? <ProgressMeter label={t("plannedWorkouts")} value={100 * mission.completed / Math.max(1, mission.target)}/> : null}</Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/league")} style={styles.tile}><View style={row}><Text style={[styles.eyebrow, styles.flex]}>{t("leagueTab")}</Text><Feather name="award" size={20} color={colors.bronze}/></View><Text style={styles.value}>{league.data?.personal_rank != null ? "#" + formatNumber(league.data.personal_rank, locale) : "—"}</Text><Text style={styles.small}>{t(game.data?.league_opt_in ? "unranked" : "joinLeague")}</Text></Pressable>
    </View>
    <Pressable accessibilityRole="button" onPress={() => router.push("/training/coach")} style={[styles.coach, rtl && styles.reverse]}><View style={styles.flex}><Text style={styles.copy}>{t("coachEncouragement")}</Text><Text style={styles.eyebrow}>BONYAN COACH</Text></View><View style={styles.coachIcon}><Feather name="message-circle" color={colors.bronze} size={26}/></View></Pressable>
    <View ref={scoreRef} onLayout={event => registerTarget("daily-score", scoreRef.current, event.nativeEvent.layout.y)} style={{gap: 4}}><Text style={styles.small}>{t("dailyScore")}: {daily.data ? formatNumber(daily.data.score, locale) + " / " + formatNumber(100, locale) : "—"}</Text><Text style={styles.small}>{t("dailyScoreHelp")}</Text>{daily.isError ? <AppButton label={t("retry")} variant="secondary" onPress={() => void daily.refetch()}/> : null}</View>
  </CoachingPage>;
}
const styles = StyleSheet.create({
  header: {alignItems: "center", flexDirection: "row", justifyContent: "space-between"},
  row: {alignItems: "center", flexDirection: "row", gap: 10}, reverse: {flexDirection: "row-reverse"},
  flex: {flex: 1, minWidth: 0, gap: 4}, wordmark: {color: colors.text, fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 3},
  title: {color: colors.text, fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 36},
  workout: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 21, lineHeight: 28},
  small: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 11, lineHeight: 17},
  copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13, lineHeight: 20},
  eyebrow: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16},
  value: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 28, lineHeight: 36},
  card: {gap: 12, padding: 16}, xp: {width: 86, gap: 4, borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: 12},
  insight: {borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10},
  avatarStrip: {flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, backgroundColor: colors.surface},
  avatar: {width: 56, height: 70, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised},
  tiles: {flexDirection: "row", gap: 12}, tile: {flex: 1, minWidth: 0, gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, minHeight: 130},
  coach: {minHeight: 98, flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface},
  coachIcon: {height: 56, width: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.bronze, alignItems: "center", justifyContent: "center"},
});
