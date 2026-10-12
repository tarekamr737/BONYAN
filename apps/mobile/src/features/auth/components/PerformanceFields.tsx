import {performanceLabel} from "../../../core/i18n/performance";
import {normalizeNumerals} from "../../../core/i18n/messages";
import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useState } from "react";
import { View } from "react-native";
import { AppTextField } from "../../../core/components";
import { performanceFields } from "../journey";
import type { CoachingPreferences, TrainingGoal } from "../types";
import { ui } from "./CoachingUI";

export function performanceError(value: CoachingPreferences): boolean {
  return [value.running_target_minutes, value.pushups_target, value.situps_target, value.pullups_target].some(v => v != null && v <= 0)
    || (value.target_weight_kg != null && value.target_weight_kg < 30)
    || [value.active_days_per_week, value.pushups, value.pushups_target, value.situps, value.situps_target, value.pullups, value.pullups_target].some(v => v != null && !Number.isInteger(v));
}

export function PerformanceFields({goal, value, onChange, arabic = false, only}: {only?: (keyof CoachingPreferences)[]; goal: TrainingGoal; value: CoachingPreferences; onChange: (value: CoachingPreferences) => void; arabic?: boolean}) {
  const visible = performanceFields(goal);
  const [textValues, setTextValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item == null ? "" : String(item)])));
  const fields: {key: keyof CoachingPreferences; max: number}[] = [
    {key: "active_days_per_week", max: 7},
    ...(visible.running ? [{key: "running_minutes" as const, max: 180}, {key: "running_target_minutes" as const, max: 180}] : []),
    ...(visible.pushups ? [{key: "pushups" as const, max: 200}, {key: "pushups_target" as const, max: 200}] : []),
    ...(visible.situps ? [{key: "situps" as const, max: 300}, {key: "situps_target" as const, max: 300}] : []),
    ...(visible.pullups ? [{key: "pullups" as const, max: 100}, {key: "pullups_target" as const, max: 100}] : []),
    ...(visible.weightTarget ? [{key: "target_weight_kg" as const, max: 350}] : []),
  ];
  return <View style={ui.stack}><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_9c0544b8938f", arabic)}</Text>{fields.filter(field => !only || only.includes(field.key)).map(field => <AppTextField key={field.key} label={performanceLabel(field.key, arabic ? "ar-EG" : "en")} keyboardType="numeric" value={textValues[field.key] ?? ""} onChangeText={raw => { const text = normalizeNumerals(raw); if (text === "") {setTextValues(current => ({...current, [field.key]: text})); onChange({...value, [field.key]: null});} else if (/^\d{1,3}(\.\d{0,2})?$/.test(text) && Number(text) <= field.max) {setTextValues(current => ({...current, [field.key]: text})); onChange({...value, [field.key]: Number(text)});} }} />)}{performanceError(value) ? <Text accessibilityRole="alert" style={ui.error}>{phrase("copy_719e42595871", arabic)}</Text> : null}</View>;
}
