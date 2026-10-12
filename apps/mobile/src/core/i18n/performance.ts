import {translate, type Locale} from "./messages";
const labels = {
  "active_days_per_week": [
    "Active days last week · optional · 0–7",
    "أيام النشاط الأسبوع الماضي · ٠–٧"
  ],
  "running_minutes": [
    "Comfortable continuous running · minutes · optional",
    "الجري المتواصل براحة · دقائق"
  ],
  "running_target_minutes": [
    "Your running target · minutes · optional",
    "هدفك للجري · دقائق"
  ],
  "pushups": [
    "Current comfortable push-ups · optional",
    "عدد الضغط المريح حاليًا"
  ],
  "pushups_target": [
    "Your push-up target · optional",
    "هدفك لعدد الضغط"
  ],
  "situps": [
    "Current comfortable sit-ups · optional",
    "عدد تمارين البطن المريح حاليًا"
  ],
  "situps_target": [
    "Your sit-up target · optional",
    "هدفك لعدد تمارين البطن"
  ],
  "pullups": [
    "Current pull-ups · optional",
    "عدد العقلة الحالي"
  ],
  "pullups_target": [
    "Your pull-up target · optional",
    "هدفك لعدد العقلة"
  ],
  "target_weight_kg": [
    "Your weight target · kg · optional",
    "الوزن المستهدف · كجم"
  ]
} as const;
export function performanceLabel(key: string, locale: Locale) {return labels[key as keyof typeof labels]?.[locale === "ar-EG" ? 1 : 0] ?? translate("unknown", locale);}
