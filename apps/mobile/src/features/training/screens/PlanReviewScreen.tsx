import { phrase } from "../../../core/i18n/copy";
import { View } from "react-native";
import type { WorkoutDay } from "../types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useRef } from "react";
import { AppButton, ScreenState } from "../../../core/components";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { CoachingPage, ui } from "../../auth/components/CoachingUI";
import { activateWorkoutPlan, getWorkoutPlan } from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";
import { planNeedsRefresh, planRefreshMessage } from "../planIntegrity";

export function PlanReviewScreen() {
  const { planId } = useLocalSearchParams<{planId?: string}>();
  const arabic = useContext(LanguageDirection);
  const client = useQueryClient();
  const busy = useRef(false);
  const plan = useQuery({queryKey: ["training", "preview", planId], enabled: Boolean(planId), queryFn: () => getWorkoutPlan(planId!)});
  const approve = useMutation({mutationFn: () => activateWorkoutPlan(planId!), onSuccess: async updated => {
    client.setQueryData(["training", "current-plan"], updated);
    await client.invalidateQueries({queryKey: ["training"]});
    router.replace("/training");
  }});
  async function confirm() {
    if (busy.current || !plan.data) return;
    busy.current = true;
    try { await approve.mutateAsync(); } catch { /* Recovery rendered below. */ }
    finally { busy.current = false; }
  }
  return <CoachingPage arabic={arabic}>
    <Text accessibilityRole="header" style={ui.title}>{phrase("copy_e17648ea8965", arabic)}</Text>
    <Text style={ui.text}>{phrase("copy_003a0a35c958", arabic)}</Text>
    {!planId ? <ScreenState message={phrase("copy_fcfd6aa02e90", arabic)} variant="error" title={phrase("copy_6f10dedda5fc", arabic)} actionLabel={phrase("copy_4fbb7fee1e9e", arabic)} onAction={() => router.replace("/training")} /> : plan.isError ? <ScreenState message={phrase("copy_9cf131dc887e", arabic)} variant="error" title={phrase("copy_6f10dedda5fc", arabic)} actionLabel={phrase("copy_bb30cda7c34e", arabic)} onAction={() => void plan.refetch()} /> : plan.isPending ? <ScreenState variant="loading" message={phrase("copy_08206818d955", arabic)} /> : plan.data.days.map(day => <ViewDay key={day.key} day={day} arabic={arabic} />)}
    {approve.isError ? <Text accessibilityRole="alert" style={ui.error}>{phrase("copy_24f5f76c575f", arabic)}</Text> : null}
    {planNeedsRefresh(plan.data) ? <Text accessibilityRole="alert" style={ui.error}>{planRefreshMessage(arabic)}</Text> : null}
    <AppButton label={phrase("copy_4fbe9593f5eb", arabic)} disabled={!plan.data || planNeedsRefresh(plan.data) || plan.data.status === "archived"} loading={approve.isPending} onPress={() => void confirm()} />
    <AppButton variant="secondary" label={phrase("copy_9fbc86337ebd", arabic)} disabled={approve.isPending} onPress={() => router.push("/training/coach")} />
    <AppButton variant="secondary" label={phrase("copy_10037d2cd763", arabic)} disabled={approve.isPending} onPress={() => router.replace("/training")} />
  </CoachingPage>;
}

function ViewDay({day, arabic}: {day: WorkoutDay; arabic: boolean}) {
  return <View style={ui.stack}><Text style={ui.heading}>{day.name}</Text>{day.prescriptions.map((exercise, index) => <ExerciseCard key={`${exercise.exercise_id}-${index}`} exercise={exercise} index={index} arabic={arabic} />)}</View>;
}
