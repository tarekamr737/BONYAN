import {exerciseCount, workoutDayLabel as displayDayName,weightFromKg, weightToKg} from "../../../core/i18n/fitness";
import {formatNumber} from "../../../core/i18n/messages";
import { phrase, phraseTemplate } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import {
  completeWorkoutSession,
  getCurrentWorkoutPlan,
  getWorkoutSession,
  getWorkoutPlan,
  logWorkoutSet,
  startWorkoutSession,
} from "../api/trainingApi";
import { ExerciseMedia } from "../components/ExerciseMedia";
import { WorkoutRecovery } from "../components/WorkoutRecovery";
import { SessionSubstitutionPanel } from "../components/SessionSubstitutionPanel";
import {ExerciseDetails} from "../components/ExerciseDetails";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {getMyProfile} from "../../auth/api/profileApi";
import { ExerciseCard } from "../components/ExerciseCard";
import {NumberWheel} from "../components/NumberWheel";
import Feather from "@expo/vector-icons/Feather";
import {InfoSheet} from "../../../core/components/InfoSheet";
import { selectWorkoutDay } from "../selectWorkoutDay";
import { planNeedsRefresh, planRefreshMessage } from "../planIntegrity";
import type { WorkoutSession } from "../types";

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}



export function WorkoutDayScreen() {
  const arabic = useContext(LanguageDirection);
  const {t, locale} = useLocale();
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const imperial = profile.data?.preferred_units === "imperial";
  const [showInfo, setShowInfo] = useState(false);
  const [reviewCompletion, setReviewCompletion] = useState(false);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const dayKey = paramValue(params.dayKey);
  const sessionId = paramValue(params.sessionId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reps, setReps] = useState(10);
  const [repsBusy, setRepsBusy] = useState(false);
  const [weightBusy, setWeightBusy] = useState(false);
  const actionLock = useRef(false);
  const [weight, setWeight] = useState(0);
  const [localSession, setSession] = useState<WorkoutSession | null>(null);
  const savedSession = useQuery({queryKey: ["training", "session", sessionId], enabled: Boolean(sessionId), queryFn: () => getWorkoutSession(sessionId!)});
  const session = localSession && (!sessionId || localSession.id === sessionId)
    && (!savedSession.data || localSession.version > savedSession.data.version)
    ? localSession
    : savedSession.data ?? null;

  const planQuery = useQuery({
    enabled: !sessionId || Boolean(session),
    queryFn: () => session?.plan_id ? getWorkoutPlan(session.plan_id) : getCurrentWorkoutPlan(),
    queryKey: session?.plan_id ? ["training", "plan", session.plan_id] : ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const needsRefresh = planNeedsRefresh(plan);
  const day = useMemo(() => session?.prescription_snapshot ?? selectWorkoutDay(plan?.days ?? [], dayKey, session?.day_key), [dayKey, plan?.days, session?.day_key, session?.prescription_snapshot]);
  const active = day?.prescriptions[activeIndex] ?? day?.prescriptions[0];
  const placeholderExercise = active?.exercise_id.startsWith("fallback-") ?? false;
  const completedSets =
    session?.logged_sets.filter((item) => item.prescription_index === activeIndex).length ?? 0;
  const nextSetNumber = completedSets + 1;
  const sessionComplete = session?.status === "completed";

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id || !day?.key) {
        throw new Error("No workout day is ready to start.");
      }
      return startWorkoutSession(plan.id, day.key);
    },
    onSuccess: (startedSession) => {
      setSession(startedSession);
      router.setParams({ dayKey: startedSession.day_key, sessionId: startedSession.id });
    },
    onSettled: () => {actionLock.current = false;},
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id || !active) {
        throw new Error("Start the workout before logging sets.");
      }
      return logWorkoutSet(session.id, {
        completed: true,
        prescription_index: activeIndex,
        reps,
        set_number: nextSetNumber,
        weight_kg: weight,
      });
    },
    onSuccess: setSession,
    onSettled: () => {actionLock.current = false;},
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id) {
        throw new Error("Start the workout before completing it.");
      }
      return completeWorkoutSession(session.id);
    },
    onSuccess: (completedSession) => {
      setSession(completedSession);
      queryClient.invalidateQueries({ queryKey: ["training"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] });
      queryClient.invalidateQueries({ queryKey: ["game"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, arabic && {flexDirection: "row-reverse"}]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("back")} style={styles.headerAction} onPress={() => router.canGoBack() ? router.back() : router.replace("/training")}><Feather name={arabic ? "arrow-right" : "arrow-left"} color={colors.bronze} size={22}/></Pressable>
          <View style={{flex: 1}}><Text accessibilityRole="header" style={styles.headerTitle}>{displayDayName(day?.name, arabic)}</Text><Text style={[styles.detail, {marginTop: 0, fontSize: 11}]}>{day ? exerciseCount(day.prescriptions.length, locale) : ""}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={t("screenDetails")} style={styles.headerAction} onPress={() => setShowInfo(true)}><Feather name="info" color={colors.green} size={22}/></Pressable>
        </View>

        {sessionId && !session && savedSession.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_99efe666a4a1", arabic)}</Text>
          </SurfaceCard>
        ) : null}

        {(!sessionId || session) && planQuery.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_198116c26fad", arabic)}</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_26d85bd5316d", arabic)}</Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>{phrase("copy_0aef5de01d6c", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !day ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_480df73fe366", arabic)}</Text>
            <Text style={styles.stateCopy}>{phrase("copy_98e859472f0b", arabic)}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/training")}
              style={styles.completeButton}
            >
              <Text style={styles.completeButtonText}>{phrase("copy_3a8f0dbac970", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {needsRefresh ? <SurfaceCard><Text accessibilityRole="alert" style={styles.stateCopy}>{planRefreshMessage(arabic)}</Text><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => router.replace("/training")}><Text style={styles.completeButtonText}>{phrase("copy_4fbb7fee1e9e", arabic)}</Text></Pressable></SurfaceCard> : null}
        {sessionId && savedSession.isError ? <SurfaceCard><Text style={styles.errorText}>{phrase("copy_282999cf84e4", arabic)}</Text><Pressable accessibilityRole="button" onPress={() => void savedSession.refetch()} style={styles.completeButton}><Text style={styles.completeButtonText}>{phrase("copy_bb30cda7c34e", arabic)}</Text></Pressable></SurfaceCard> : null}
        {day && active && (!sessionId || session) ? (
          <>
            <SurfaceCard style={{padding: 16}}>
              <Text style={styles.activeName}>{active.name}</Text><Text style={styles.detail}>{formatNumber(activeIndex + 1, locale)} / {formatNumber(day.prescriptions.length, locale)}</Text>
              <ExerciseMedia exerciseId={active.exercise_id} name={active.name} arabic={arabic} height={140}/>
              <Text style={styles.detail}>
                {formatNumber(active.sets, locale)} {t("sets")} × {formatNumber(active.reps_min, locale)}–{formatNumber(active.reps_max, locale)} {t("reps")} · {t("rest")}: {formatNumber(active.rest_seconds, locale)} {t("seconds")}
              </Text>
              <View style={[styles.stepperRow, arabic && {flexDirection: "row-reverse"}]}>
                <NumberWheel key={"reps-" + activeIndex} label={t("reps")} min={0} max={50} step={1} value={reps} onChange={setReps} onBusyChange={setRepsBusy} disabled={sessionComplete || logMutation.isPending || completeMutation.isPending}/>
                <NumberWheel key={"weight-" + activeIndex + imperial} label={t("weight") + " (" + t(imperial ? "pound" : "kilogram") + ")"} min={0} max={imperial ? 660 : 300} step={imperial ? 5 : 2.5} value={Math.round(weightFromKg(weight, imperial) * 10000) / 10000} onChange={value => setWeight(weightToKg(value, imperial))} onBusyChange={setWeightBusy} disabled={sessionComplete || logMutation.isPending || completeMutation.isPending}/>
              </View>
              <Text style={[styles.detail, {fontSize: 11, marginTop: 0}]}>{t("swipeToChoose")}</Text>
              <WorkoutRecovery session={session} exercise={active} index={activeIndex} showHistory={false}/>
              {startMutation.isError || logMutation.isError ? (
                <Text style={styles.errorText}>{phrase("copy_3c8a982a67e3", arabic)}</Text>
              ) : null}
            </SurfaceCard>

            {activeIndex < day.prescriptions.length - 1 ? <Pressable accessibilityRole="button" disabled={logMutation.isPending || completeMutation.isPending} style={styles.completeButton} onPress={() => { setActiveIndex(index => index + 1); }}><Text style={styles.completeButtonText}>{phrase("copy_2b5f2b340a3f", arabic)}</Text></Pressable> : null}
            {sessionComplete ? <SurfaceCard><Text style={styles.stateTitle}>{phrase("copy_373f1549859f", arabic)}</Text><Text style={styles.detail}>{session.logged_sets.length} {phrase("copy_a91f53f9767a", arabic)}</Text><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => router.replace("/training")}><Text style={styles.completeButtonText}>{phrase("copy_4fbb7fee1e9e", arabic)}</Text></Pressable></SurfaceCard> : null}
            <InfoSheet visible={showInfo} title={t("screenDetails")} onClose={() => setShowInfo(false)}>
            <ExerciseDetails exerciseId={active.exercise_id}/>
            <WorkoutRecovery session={session} exercise={active} index={activeIndex}/>
            {session && !sessionComplete && completedSets < active.sets ? <SessionSubstitutionPanel key={`${session.id}-${activeIndex}`} session={session} index={activeIndex} onCommitted={setSession}/> : null}
            <View style={styles.list}>
              {day.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  arabic={arabic}
                  key={`${exercise.exercise_id}-${index}`}
                  active={index === activeIndex}
                  exercise={exercise}
                  index={index}
                  onPress={() => {if (logMutation.isPending || completeMutation.isPending) return; setActiveIndex(index); setShowInfo(false);}}
                />
              ))}
            </View>

            </InfoSheet>
            {reviewCompletion && !sessionComplete ? <SurfaceCard><Text style={styles.stateTitle}>{t("completionReview")}</Text><Text style={styles.detail}>{t("completionHelp")}</Text><Pressable accessibilityRole="button" disabled={completeMutation.isPending || logMutation.isPending} style={styles.completeButton} onPress={() => completeMutation.mutate()}><Text style={styles.completeButtonText}>{t("confirmCompletion")}</Text></Pressable><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => setReviewCompletion(false)}><Text style={styles.completeButtonText}>{t("cancel")}</Text></Pressable></SurfaceCard> : null}
            <Pressable
              accessibilityRole="button"
              disabled={!session || sessionComplete || completeMutation.isPending || logMutation.isPending}
              onPress={() => setReviewCompletion(true)}
              style={[styles.completeButton, (!session || sessionComplete || completeMutation.isPending) && styles.disabledAction]}
            >
              <Text style={styles.completeButtonText}>
                {sessionComplete ? (phrase("copy_8239294ae760", arabic)) : completeMutation.isPending ? (phrase("copy_e406f91cd7ae", arabic)) : (phrase("copy_02092457a239", arabic))}
              </Text>
            </Pressable>
            {completeMutation.isError ? <Text style={styles.errorText}>{phrase("copy_5b78311a1bf2", arabic)}</Text> : null}
          </>
        ) : null}
      </ScrollView>
      {day && active && (!sessionId || session) && !sessionComplete ? <View style={styles.footer}>
              {!session ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={needsRefresh || startMutation.isPending || repsBusy || weightBusy}
                  onPress={() => {if (actionLock.current) return; actionLock.current = true; startMutation.mutate();}}
                  style={[styles.logButton, (needsRefresh || startMutation.isPending) && styles.disabledAction]}
                >
                  <Text style={styles.logButtonText}>{startMutation.isPending ? (phrase("copy_0d3f000d39a0", arabic)) : (phrase("copy_51cc7ab66cf6", arabic))}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={repsBusy || weightBusy || placeholderExercise || completeMutation.isPending || logMutation.isPending || sessionComplete || nextSetNumber > active.sets}
                  onPress={() => {if (actionLock.current) return; actionLock.current = true; logMutation.mutate();}}
                  style={[
                    styles.logButton,
                    (repsBusy || weightBusy || placeholderExercise || completeMutation.isPending || logMutation.isPending || sessionComplete || nextSetNumber > active.sets) && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.logButtonText}>
                    {nextSetNumber > active.sets ? (phrase("copy_e3b75f09ab2d", arabic)) : (phraseTemplate("copy_4f263cd01d68", arabic, (arabic) ? [nextSetNumber] : [nextSetNumber]))}
                  </Text>
                </Pressable>
              )}

      </View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: "row", alignItems: "center", gap: 8},
  headerAction: {width: 48, height: 48, alignItems: "center", justifyContent: "center"},
  headerTitle: {fontFamily: fonts.displaySemiBold, fontSize: 17, lineHeight: 23, color: colors.text, textAlign: "center"},
  footer: {paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.canvas},
  activeName: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  completeButton: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  completeButtonText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.md,
    maxWidth: 660,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: "100%",
  },
  detail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  disabledAction: {
    opacity: 0.55,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  exerciseMedia: {
    height: "100%",
    width: "100%",
  },
  mediaRetry: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    padding: spacing.md,
    width: "100%",
  },
  list: {
    gap: spacing.sm,
  },
  logButton: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 58,
  },
  logButtonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  stateCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  stepperRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.sm,
    width: "100%",
  },
  videoFrame: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    overflow: "hidden",
    width: "100%",
  },
  videoText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: "center",
  },
});
