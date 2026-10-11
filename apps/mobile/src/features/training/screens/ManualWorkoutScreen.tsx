import { phrase } from "../../../core/i18n/copy";
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
      name: phrase("copy_57bfb856f3ce", arabic),
      goal: profile.data?.training_goal ?? "general_fitness",
      experience: profile.data?.experience_level ?? "beginner",
      exercises: selected.map(item => ({ exercise_id: item.id, sets: prescriptions[item.id]?.sets ?? 3, reps_min: prescriptions[item.id]?.reps ?? 10, reps_max: prescriptions[item.id]?.reps ?? 10, rest_seconds: 90 })),
      activate: false,
    }),
    onSuccess: plan => router.replace({ pathname: "/training/review", params: { planId: plan.id } }),
  });
  const toggle = (item: ExerciseSearchItem) => setSelected(items => items.some(value => value.id === item.id) ? items.filter(value => value.id !== item.id) : items.length < 12 ? [...items, item] : items);
  return <CoachingPage arabic={arabic} footer={<AppButton disabled={!selected.length || create.isPending} label={create.isPending ? phrase("copy_355b86c14b10", arabic) : arabic ? `مراجعة التمرين (${selected.length})` : `Review workout (${selected.length})`} onPress={() => {if (busy.current) return; busy.current = true; void create.mutateAsync().catch(() => {}).finally(() => {busy.current = false;}); }} />}>
    <Pressable accessibilityRole="button" onPress={() => goBackOr("/training")} style={styles.back}><Feather color={colors.bronze} name={arabic ? "arrow-right" : "arrow-left"} size={20} /><Text style={styles.backText}>{phrase("copy_b4ffbc9cf929", arabic)}</Text></Pressable>
    <View style={styles.heading}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{phrase("copy_5c549538f76c", arabic)}</Text><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_ea6b0bae26a9", arabic)}</Text></View>
    <GlassCard><AppTextField label={phrase("copy_5ad3a79c317c", arabic)} onChangeText={setSearch} placeholder={phrase("copy_f8eedd6173c6", arabic)} returnKeyType="search" value={search} /><AppButton disabled={search.trim().length < 2} label={phrase("copy_d6e298b93d2b", arabic)} onPress={() => setSubmitted(search.trim())} variant="secondary" /></GlassCard>
    {selected.length ? <View style={[styles.selection, arabic && styles.reverse]}><Text style={styles.selectionText}>{arabic ? `${selected.length} تمارين مختارة` : `${selected.length} selected`}</Text><Pressable accessibilityLabel={phrase("copy_1be3c614d799", arabic)} accessibilityRole="button" hitSlop={8} onPress={() => setSelected([])} style={({pressed}) => [styles.clearButton, pressed && styles.pressed]}><Text style={styles.clear}>{phrase("copy_6c388236b7bd", arabic)}</Text></Pressable></View> : null}
    {selected.map(item => <GlassCard key={item.id}><Text style={ui.heading}>{item.name}</Text>{(["sets", "reps"] as const).map(key => <AppTextField key={key} label={key === "sets" ? phrase("copy_8b66c35c9fd9", arabic) : phrase("copy_8d2bd0a92894", arabic)} keyboardType="number-pad" editable={!create.isPending} value={String(prescriptions[item.id]?.[key] ?? (key === "sets" ? 3 : 10))} onChangeText={raw => {const n = Number(raw); if (Number.isInteger(n) && n >= 1 && n <= (key === "sets" ? 8 : 50)) setPrescriptions(current => ({...current, [item.id]: {...(current[item.id] ?? {sets: 3, reps: 10}), [key]: n}}));}} />)}</GlassCard>)}
    {results.isFetching ? <ActivityIndicator color={colors.bronze} /> : null}
    {results.isError ? <AppButton label={phrase("copy_4c2ac484c5fa", arabic)} onPress={() => void results.refetch()} variant="secondary" /> : null}
    {results.data?.items.map(item => { const active = selected.some(value => value.id === item.id); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{checked: active}} onPress={() => toggle(item)} style={({pressed}) => [styles.result, active && styles.resultActive, pressed && styles.pressed]}><View style={{flex: 1, gap: 5}}><Text style={[styles.resultTitle, arabic && ui.rtl]}>{item.name}</Text><Text style={[ui.small, arabic && ui.rtl]}>{[...item.muscles, ...item.equipment].slice(0, 3).join(" · ")}</Text></View><Feather color={active ? colors.bronze : colors.muted} name={active ? "check-circle" : "plus-circle"} size={22} /></Pressable>; })}
    {!results.isFetching && submitted && results.data?.items.length === 0 ? <GlassCard><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_5c596a1ec65b", arabic)}</Text></GlassCard> : null}
    {create.isError ? <Text style={[ui.error, arabic && ui.rtl]}>{phrase("copy_5adf1d226dbc", arabic)}</Text> : null}
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
