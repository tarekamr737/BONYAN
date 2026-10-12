import { formatNumber, parseLocalizedNumber } from "../../../core/i18n/messages";
import { phrase, phraseTemplate } from "../../../core/i18n/copy";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppButton, AppTextField, DirectionalText as Text } from "../../../core/components";
import { goBackOr } from "../../../core/navigation/safeNavigation";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { getMyProfile } from "../../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
import { createManualWorkoutPlan, getExerciseCatalog, searchExercises } from "../api/trainingApi";
import {toggleExerciseSelection} from "../catalogSelection";
import type { ExerciseSearchItem } from "../types";
import { ExerciseMedia } from "../components/ExerciseMedia";
import {ExerciseDetails} from "../components/ExerciseDetails";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {fitnessLabel, exerciseCount} from "../../../core/i18n/fitness";

export function ManualWorkoutScreen() {
  const busy = useRef(false);
  const filterScroll = useRef<ScrollView>(null);
  const {t, locale} = useLocale();
  const [prescriptions, setPrescriptions] = useState<Record<string, {sets: number; reps: number; rest: number}>>({});
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const {rtl: arabic} = useLocale();
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<ExerciseSearchItem[]>([]);
  const [group, setGroup] = useState("");
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);
  const catalog = useQuery({queryFn: getExerciseCatalog, queryKey: ["training", "catalog"]});
  const results = useQuery({enabled: catalog.data?.available === true, queryFn: () => searchExercises(submitted, page, group || undefined), queryKey: ["training", "exercise-browse", submitted, group, page], staleTime: 300_000});
  const create = useMutation({
    mutationFn: () => createManualWorkoutPlan({
      name: phrase("copy_57bfb856f3ce", arabic),
      goal: profile.data?.training_goal ?? "general_fitness",
      experience: profile.data?.experience_level ?? "beginner",
      exercises: selected.map(item => ({ exercise_id: item.id, sets: prescriptions[item.id]?.sets ?? 3, reps_min: prescriptions[item.id]?.reps ?? 10, reps_max: prescriptions[item.id]?.reps ?? 10, rest_seconds: prescriptions[item.id]?.rest ?? 90 })),
      activate: false,
    }),
    onSuccess: plan => router.replace({ pathname: "/training/review", params: { planId: plan.id } }),
  });
  const toggle = (item: ExerciseSearchItem) => setSelected(items => toggleExerciseSelection(items, item));
  return <CoachingPage arabic={arabic} contentStyle={{padding: 16, gap: 12}} footer={<AppButton disabled={!selected.length || create.isPending} label={create.isPending ? phrase("copy_355b86c14b10", arabic) : phraseTemplate("copy_8e43548a4426", arabic, [formatNumber(selected.length, locale)])} onPress={() => {if (busy.current) return; busy.current = true; void create.mutateAsync().catch(() => {}).finally(() => {busy.current = false;}); }} />}>
    <View style={[styles.resultHeader, arabic && styles.reverse]}><Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => goBackOr("/training")} style={{height: 48, width: 48, alignItems: "center", justifyContent: "center"}}><Feather color={colors.bronze} name={arabic ? "arrow-right" : "arrow-left"} size={20}/></Pressable><Text accessibilityRole="header" style={[ui.heading, {flex: 1}]}>{t("browseExercises")}</Text></View>
    <Text style={[ui.small, {fontSize: 13, lineHeight: 20}]}>{t("chooseMovement")}</Text>
    <View style={[styles.resultHeader, arabic && styles.reverse]}><View style={{flex: 1}}><AppTextField label={phrase("copy_5ad3a79c317c", arabic)} hideLabel onChangeText={setSearch} placeholder={phrase("copy_f8eedd6173c6", arabic)} returnKeyType="search" value={search} onSubmitEditing={() => {setPage(1); setSubmitted(search.trim());}}/></View><Pressable accessibilityRole="button" accessibilityLabel={phrase("copy_d6e298b93d2b", arabic)} onPress={() => {setPage(1); setSubmitted(search.trim());}} style={styles.select}><Feather name="search" size={22} color={colors.bronze}/></Pressable></View>
    <ScrollView ref={filterScroll} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => {if (arabic) filterScroll.current?.scrollToEnd({animated: false});}} contentContainerStyle={{gap: 8, flexDirection: arabic ? "row-reverse" : "row"}}>{["", "chest", "back", "upper legs", "shoulders", "upper arms"].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected: group === value}} onPress={() => {setGroup(value); setPage(1);}} style={[styles.chip, group === value && styles.resultActive]}><Text style={styles.resultTitle}>{value ? fitnessLabel(value, locale) : t("allExercises")}</Text></Pressable>)}</ScrollView>
    {catalog.data?.available === false ? <Text style={ui.text}>{t("catalogLicenseRequired")}</Text> : catalog.isError ? <AppButton label={t("retry")} onPress={() => void catalog.refetch()} variant="secondary"/> : null}
    {selected.length ? <View style={[styles.selection, arabic && styles.reverse]}><Text style={styles.selectionText}>{phraseTemplate("copy_5e6fe8ac465b", arabic, (arabic) ? [selected.length] : [selected.length])}</Text><Pressable accessibilityLabel={phrase("copy_1be3c614d799", arabic)} accessibilityRole="button" hitSlop={8} onPress={() => setSelected([])} style={({pressed}) => [styles.clearButton, pressed && styles.pressed]}><Text style={styles.clear}>{phrase("copy_6c388236b7bd", arabic)}</Text></Pressable></View> : null}
    {selected.length ? <><Text style={ui.small}>{selected.map(item => arabic && item.translated_name ? item.translated_name : item.name).join(" · ")}</Text><AppButton variant="secondary" label={`${t("sets")} · ${exerciseCount(selected.length, locale)}`} onPress={() => setEditing(!editing)}/></> : null}
    {editing ? selected.map(item => <GlassCard key={item.id}><View style={styles.resultHeader}><ExerciseMedia exerciseId={item.id} name={item.name} arabic={arabic} compact previewSize={112}/><Text style={[ui.heading, {flex: 1}]}>{arabic && item.translated_name ? item.translated_name : item.name}</Text></View><ExerciseDetails exerciseId={item.id} collapsible/>{(["sets", "reps", "rest"] as const).map(key => <AppTextField key={key} label={key === "rest" ? `${t("rest")} · ${t("seconds")}` : t(key)} keyboardType="number-pad" editable={!create.isPending} value={String(prescriptions[item.id]?.[key] ?? (key === "sets" ? 3 : key === "rest" ? 90 : 10))} onChangeText={raw => {const n = parseLocalizedNumber(raw); if (Number.isInteger(n) && n >= (key === "rest" ? 15 : 1) && n <= (key === "sets" ? 8 : key === "rest" ? 300 : 50)) setPrescriptions(current => ({...current, [item.id]: {...(current[item.id] ?? {sets: 3, reps: 10, rest: 90}), [key]: n}}));}} />)}</GlassCard>) : null}
    {results.isFetching ? <ActivityIndicator color={colors.bronze} /> : null}
    {results.isError ? <AppButton label={phrase("copy_4c2ac484c5fa", arabic)} onPress={() => void results.refetch()} variant="secondary" /> : null}
    {results.data?.items.map(item => {const active = selected.some(value => value.id === item.id); return <View key={item.id} style={[styles.result, active && styles.resultActive]}><View style={[styles.resultHeader, arabic && styles.reverse]}><ExerciseMedia exerciseId={item.id} name={item.name} arabic={arabic} compact previewSize={116}/><View style={{flex: 1, gap: 8}}><Text style={styles.resultTitle}>{arabic && item.translated_name ? item.translated_name : item.name}</Text><Text style={ui.small}>{item.muscles.map(value => fitnessLabel(value, locale)).join(" · ")}</Text><Text style={ui.small}>{item.equipment.map(value => fitnessLabel(value, locale, "equipment")).join(" · ")}</Text><Pressable accessibilityRole="checkbox" accessibilityState={{checked: active, disabled: !active && selected.length >= 12}} accessibilityLabel={`${t(active ? "removeExercise" : "addExercise")}: ${item.name}`} disabled={!active && selected.length >= 12} onPress={() => toggle(item)} style={styles.select}><Feather color={colors.bronze} name={active ? "check" : "plus"} size={22}/></Pressable></View></View><ExerciseDetails exerciseId={item.id} collapsible/></View>;})}
    <View style={styles.resultHeader}>{page > 1 ? <AppButton label={t("back")} variant="secondary" onPress={() => setPage(page - 1)}/> : null}{results.data?.next_page ? <AppButton label={t("moreExercises")} variant="secondary" onPress={() => setPage(results.data!.next_page!)}/> : null}</View>
    {catalog.data ? <Text style={ui.small}>{t("mediaSource")}: {catalog.data.source_name}</Text> : null}
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
  result: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.card, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  resultHeader: {alignItems: "center", flexDirection: "row", gap: 12},
  select: {minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", backgroundColor: colors.surfaceRaised, borderRadius: 16},
  chip: {minHeight: 48, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line},
  resultActive: { backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder },
  resultTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  reverse: { flexDirection: "row-reverse" },
  selection: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  selectionText: { color: colors.text, fontFamily: fonts.bodySemiBold },
});
