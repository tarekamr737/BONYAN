import {useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {DirectionalText as Text} from "../../../core/components/DirectionalText";
import {SurfaceCard} from "../../../core/components/SurfaceCard";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {fitnessLabel} from "../../../core/i18n/fitness";
import {formatNumber} from "../../../core/i18n/messages";
import {colors, fonts, spacing} from "../../../core/theme/tokens";
import type {ExercisePrescription} from "../types";
import {ExerciseDetails} from "./ExerciseDetails";
import {ExerciseMedia} from "./ExerciseMedia";

type Props = {arabic?: boolean; exercise: ExercisePrescription; index: number; active?: boolean; onPress?: () => void};
export function ExerciseCard({exercise, index, active = false, onPress}: Props) {
  const {t, locale, rtl} = useLocale(); const [expanded, setExpanded] = useState(false);
  const prescription = `${formatNumber(exercise.sets, locale)} ${t("sets")} × ${formatNumber(exercise.reps_min, locale)}–${formatNumber(exercise.reps_max, locale)} ${t("reps")}`;
  const content = <SurfaceCard style={[styles.card, active && {borderColor: colors.bronze}]}>
    <View style={[styles.row, rtl && {flexDirection: "row-reverse"}]}><ExerciseMedia exerciseId={exercise.exercise_id} name={exercise.name} arabic={rtl} compact/><View style={styles.content}>
      <Text style={styles.name}>{formatNumber(index + 1, locale)} · {exercise.name}</Text><Text style={styles.meta}>{prescription}</Text><Text style={styles.meta}>{t("rest")}: {formatNumber(exercise.rest_seconds, locale)} {t("seconds")}</Text>
    </View></View>
    <Text style={styles.meta}>{exercise.muscles.map(value => fitnessLabel(value, locale)).join(" · ")}</Text>
    <Text style={styles.meta}>{exercise.equipment.map(value => fitnessLabel(value, locale, "equipment")).join(" · ")}</Text>
    {exercise.notes && (!rtl || /[\u0600-\u06ff]/u.test(exercise.notes)) ? <Text style={styles.meta}>{exercise.notes}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={event => {event.stopPropagation(); setExpanded(!expanded);}} style={styles.details}><Text style={styles.label}>{t("exerciseDetails")}{expanded ? " −" : " +"}</Text></Pressable>
    {expanded ? <ExerciseDetails exerciseId={exercise.exercise_id}/> : null}
  </SurfaceCard>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}, ${prescription}`} accessibilityState={{selected: active}} onPress={onPress}>{content}</Pressable> : content;
}
const styles = StyleSheet.create({card: {gap: spacing.sm}, row: {alignItems: "center", flexDirection: "row", gap: spacing.sm}, content: {flex: 1, minWidth: 0, gap: spacing.xs}, name: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22}, meta: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13, lineHeight: 20}, details: {minHeight: 50, justifyContent: "center"}, label: {color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14}});
