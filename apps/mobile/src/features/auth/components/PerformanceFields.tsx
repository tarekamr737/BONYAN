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
  const fields: {key: keyof CoachingPreferences; label: string; max: number}[] = [
    {key: "active_days_per_week", label: "Active days last week · optional · 0–7", max: 7},
    ...(visible.running ? [{key: "running_minutes" as const, label: "Comfortable continuous running · minutes · optional", max: 180}, {key: "running_target_minutes" as const, label: "Your running target · minutes · optional", max: 180}] : []),
    ...(visible.pushups ? [{key: "pushups" as const, label: "Current comfortable push-ups · optional", max: 200}, {key: "pushups_target" as const, label: "Your push-up target · optional", max: 200}] : []),
    ...(visible.situps ? [{key: "situps" as const, label: "Current comfortable sit-ups · optional", max: 300}, {key: "situps_target" as const, label: "Your sit-up target · optional", max: 300}] : []),
    ...(visible.pullups ? [{key: "pullups" as const, label: "Current pull-ups · optional", max: 100}, {key: "pullups_target" as const, label: "Your pull-up target · optional", max: 100}] : []),
    ...(visible.weightTarget ? [{key: "target_weight_kg" as const, label: "Your weight target · kg · optional", max: 350}] : []),
  ];
  const labels: Record<string, string> = {active_days_per_week: "أيام النشاط الأسبوع الماضي · ٠–٧", running_minutes: "الجري المتواصل براحة · دقائق", running_target_minutes: "هدفك للجري · دقائق", pushups: "عدد الضغط المريح حاليًا", pushups_target: "هدفك لعدد الضغط", situps: "عدد تمارين البطن المريح حاليًا", situps_target: "هدفك لعدد تمارين البطن", pullups: "عدد العقلة الحالي", pullups_target: "هدفك لعدد العقلة", target_weight_kg: "الوزن المستهدف · كجم"};
  return <View style={ui.stack}><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "كل الإجابات اختيارية. استخدم قدراتك المعروفة؛ مش مطلوب اختبار بأقصى مجهود. الأهداف شخصية وليست شروط قبول رسمية." : "Use abilities you already know. You do not need to attempt a maximum-effort test. Targets are yours, not official entry requirements."}</Text>{fields.filter(field => !only || only.includes(field.key)).map(field => <AppTextField key={field.key} label={arabic ? labels[field.key] ?? field.label : field.label} keyboardType="numeric" value={textValues[field.key] ?? ""} onChangeText={raw => { const text = raw.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace("٫", "."); if (text === "") {setTextValues(current => ({...current, [field.key]: text})); onChange({...value, [field.key]: null});} else if (/^\d{1,3}(\.\d{0,2})?$/.test(text) && Number(text) <= field.max) {setTextValues(current => ({...current, [field.key]: text})); onChange({...value, [field.key]: Number(text)});} }} />)}{performanceError(value) ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "الأهداف أكبر من صفر، والوزن من ٣٠ كجم. الأيام والتكرارات أعداد صحيحة." : "Targets must exceed zero and weight must be at least 30 kg. Days and repetitions must be whole numbers."}</Text> : null}</View>;
}
