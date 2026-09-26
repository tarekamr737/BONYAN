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
    <Text accessibilityRole="header" style={ui.title}>{arabic ? "راجع خطتك" : "Review your plan"}</Text>
    <Text style={ui.text}>{arabic ? "راجع التمارين قبل الاعتماد. اعتماد الخطة يستبدل خطتك النشطة ويحافظ على سجل تمريناتك." : "Review every exercise before approval. Approving replaces your active plan and preserves workout history."}</Text>
    {!planId ? <ScreenState message={arabic ? "معرّف الخطة مفقود." : "Plan link is incomplete."} variant="error" title={arabic ? "الخطة غير متاحة" : "Plan unavailable"} actionLabel={arabic ? "العودة للتدريب" : "Back to training"} onAction={() => router.replace("/training")} /> : plan.isError ? <ScreenState message={arabic ? "تعذر تحميل الخطة." : "Could not load the plan."} variant="error" title={arabic ? "الخطة غير متاحة" : "Plan unavailable"} actionLabel={arabic ? "إعادة المحاولة" : "Retry"} onAction={() => void plan.refetch()} /> : plan.isPending ? <ScreenState variant="loading" message={arabic ? "جارٍ تحميل الخطة" : "Loading plan"} /> : plan.data.days.map(day => <ViewDay key={day.key} day={day} arabic={arabic} />)}
    {approve.isError ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذر اعتماد الخطة. جرّب تاني." : "Could not approve the plan. Please retry."}</Text> : null}
    <AppButton label={arabic ? "اعتماد الخطة" : "Approve plan"} disabled={!plan.data || plan.data.status === "archived"} loading={approve.isPending} onPress={() => void confirm()} />
    <AppButton variant="secondary" label={arabic ? "طلب تعديل من الكوتش" : "Request changes from Coach"} disabled={approve.isPending} onPress={() => router.push("/training/coach")} />
    <AppButton variant="secondary" label={arabic ? "رجوع بدون اعتماد" : "Back without approving"} disabled={approve.isPending} onPress={() => router.replace("/training")} />
  </CoachingPage>;
}

function ViewDay({day, arabic}: {day: WorkoutDay; arabic: boolean}) {
  return <View style={ui.stack}><Text style={ui.heading}>{day.name}</Text>{day.prescriptions.map((exercise, index) => <ExerciseCard key={`${exercise.exercise_id}-${index}`} exercise={exercise} index={index} arabic={arabic} />)}</View>;
}
