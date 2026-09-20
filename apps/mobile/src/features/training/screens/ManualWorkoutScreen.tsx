import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppButton, AppTextField, DirectionalText as Text } from "../../../core/components";
import { goBackOr } from "../../../core/navigation/safeNavigation";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { getMyProfile } from "../../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
import { createManualWorkoutPlan, searchExercises } from "../api/trainingApi";
import type { ExerciseSearchItem } from "../types";

export function ManualWorkoutScreen() {
  const busy = useRef(false);
  const [prescriptions, setPrescriptions] = useState<Record<string, {sets: number; reps: number}>>({});
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<ExerciseSearchItem[]>([]);
  const results = useQuery({ enabled: submitted.length > 1, queryFn: () => searchExercises(submitted), queryKey: ["training", "exercise-search", submitted] });
  const create = useMutation({
    mutationFn: () => createManualWorkoutPlan({
      name: arabic ? "تمرين مخصص" : "Custom workout",
      goal: profile.data?.training_goal ?? "general_fitness",
      experience: profile.data?.experience_level ?? "beginner",
      exercises: selected.map(item => ({ exercise_id: item.id, sets: prescriptions[item.id]?.sets ?? 3, reps_min: prescriptions[item.id]?.reps ?? 10, reps_max: prescriptions[item.id]?.reps ?? 10, rest_seconds: 90 })),
      activate: false,
    }),
    onSuccess: plan => router.replace({ pathname: "/training/review", params: { planId: plan.id } }),
  });
  const toggle = (item: ExerciseSearchItem) => setSelected(items => items.some(value => value.id === item.id) ? items.filter(value => value.id !== item.id) : items.length < 12 ? [...items, item] : items);
  return <CoachingPage arabic={arabic} footer={<AppButton disabled={!selected.length || create.isPending} label={create.isPending ? arabic ? "جاري تجهيز التمرين…" : "Preparing workout…" : arabic ? `مراجعة التمرين (${selected.length})` : `Review workout (${selected.length})`} onPress={() => {if (busy.current) return; busy.current = true; void create.mutateAsync().catch(() => {}).finally(() => {busy.current = false;}); }} />}>
    <Pressable accessibilityRole="button" onPress={() => goBackOr("/training")} style={styles.back}><Feather color={colors.bronze} name={arabic ? "arrow-right" : "arrow-left"} size={20} /><Text style={styles.backText}>{arabic ? "التمرين" : "Training"}</Text></Pressable>
    <View style={styles.heading}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{arabic ? "ابنِ تمرينك" : "Build your workout"}</Text><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "اختر التمارين وحدد المجموعات والعدات، ثم راجع خطتك قبل اعتمادها." : "Choose exercises and set your sets and repetitions. Review the plan before approval."}</Text></View>
    <GlassCard><AppTextField label={arabic ? "ابحث عن تمرين" : "Search exercises"} onChangeText={setSearch} placeholder={arabic ? "مثال: squat أو chest" : "Example: squat or chest"} returnKeyType="search" value={search} /><AppButton disabled={search.trim().length < 2} label={arabic ? "بحث" : "Search"} onPress={() => setSubmitted(search.trim())} variant="secondary" /></GlassCard>
    {selected.length ? <View style={[styles.selection, arabic && styles.reverse]}><Text style={styles.selectionText}>{arabic ? `${selected.length} تمارين مختارة` : `${selected.length} selected`}</Text><Pressable accessibilityLabel={arabic ? "مسح كل التمارين المختارة" : "Clear all selected exercises"} accessibilityRole="button" hitSlop={8} onPress={() => setSelected([])} style={({pressed}) => [styles.clearButton, pressed && styles.pressed]}><Text style={styles.clear}>{arabic ? "مسح" : "Clear"}</Text></Pressable></View> : null}
    {selected.map(item => <GlassCard key={item.id}><Text style={ui.heading}>{item.name}</Text>{(["sets", "reps"] as const).map(key => <AppTextField key={key} label={key === "sets" ? arabic ? "المجموعات · ١–٨" : "Sets · 1–8" : arabic ? "العدات · ١–٥٠" : "Reps · 1–50"} keyboardType="number-pad" editable={!create.isPending} value={String(prescriptions[item.id]?.[key] ?? (key === "sets" ? 3 : 10))} onChangeText={raw => {const n = Number(raw); if (Number.isInteger(n) && n >= 1 && n <= (key === "sets" ? 8 : 50)) setPrescriptions(current => ({...current, [item.id]: {...(current[item.id] ?? {sets: 3, reps: 10}), [key]: n}}));}} />)}</GlassCard>)}
    {results.isFetching ? <ActivityIndicator color={colors.bronze} /> : null}
    {results.isError ? <AppButton label={arabic ? "إعادة المحاولة" : "Retry search"} onPress={() => void results.refetch()} variant="secondary" /> : null}
    {results.data?.items.map(item => { const active = selected.some(value => value.id === item.id); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{checked: active}} onPress={() => toggle(item)} style={({pressed}) => [styles.result, active && styles.resultActive, pressed && styles.pressed]}><View style={{flex: 1, gap: 5}}><Text style={[styles.resultTitle, arabic && ui.rtl]}>{item.name}</Text><Text style={[ui.small, arabic && ui.rtl]}>{[...item.muscles, ...item.equipment].slice(0, 3).join(" · ")}</Text></View><Feather color={active ? colors.bronze : colors.muted} name={active ? "check-circle" : "plus-circle"} size={22} /></Pressable>; })}
    {!results.isFetching && submitted && results.data?.items.length === 0 ? <GlassCard><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "لم نجد تمارين بهذا الاسم. جرّب كلمة أبسط بالإنجليزية." : "No exercises matched. Try a shorter search term."}</Text></GlassCard> : null}
    {create.isError ? <Text style={[ui.error, arabic && ui.rtl]}>{arabic ? "تعذر تجهيز التمرين. اختياراتك ما زالت موجودة؛ حاول مرة أخرى." : "The workout could not be prepared. Your choices are still here; try again."}</Text> : null}
  </CoachingPage>;
}

const styles = StyleSheet.create({
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: spacing.xs, minHeight: 44 },
  backText: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  clear: { color: colors.bronze, fontFamily: fonts.bodySemiBold },
  clearButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.sm },
  heading: { gap: spacing.sm },
  pressed: { opacity: .78 },
  result: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 72, padding: spacing.md },
  resultActive: { backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder },
  resultTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  reverse: { flexDirection: "row-reverse" },
  selection: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  selectionText: { color: colors.text, fontFamily: fonts.bodySemiBold },
});
