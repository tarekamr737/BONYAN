import {translate, type Locale} from "./messages";
const measurements = {
  height: ["Height", "الطول"], weight: ["Weight", "الوزن"],
  skeletal_muscle_mass: ["Skeletal muscle", "الكتلة العضلية"], body_fat_mass: ["Body fat mass", "كتلة الدهون"],
  body_fat_percentage: ["Body fat", "نسبة الدهون"], bmi: ["BMI", "مؤشر كتلة الجسم"],
  total_body_water: ["Total body water", "ميّه الجسم"], visceral_fat_level: ["Visceral fat", "الدهون الحشوية"],
  inbody_score: ["InBody score", "نتيجة InBody"],
} as const;
const flags = {
  derived: ["Calculated from other measurements", "محسوب من قياسات تانية"],
  implausible_value: ["Unusual value; check the report", "قيمة غير معتادة؛ راجع التقرير"],
  low_confidence: ["Low reading confidence", "ثقة القراءة قليلة"], missing: ["Missing", "مش موجود"],
  negative_value: ["Negative value", "قيمة سالبة"], unknown_unit: ["Unknown unit", "وحدة مش معروفة"],
} as const;
const units = {kg: ["kg", "كجم"], g: ["g", "جم"], cm: ["cm", "سم"], "%": ["%", "٪"],
  score: ["points", "نقط"], L: ["L", "لتر"], l: ["L", "لتر"], level: ["level", "مستوى"],
  "kg/m²": ["kg/m²", "كجم/م²"], "kg/m2": ["kg/m²", "كجم/م²"], kcal: ["kcal", "سعر حراري"],
} as const;
export function measurementLabel(key: string, arabic: boolean) {
  return measurements[key as keyof typeof measurements]?.[arabic ? 1 : 0] ?? translate("unknown", arabic ? "ar-EG" : "en");
}
export function reviewFlag(key: string, arabic: boolean) {
  return flags[key as keyof typeof flags]?.[arabic ? 1 : 0] ?? translate("unknown", arabic ? "ar-EG" : "en");
}
export function measurementUnit(unit: string | null | undefined, locale: Locale) {
  return unit ? units[unit as keyof typeof units]?.[locale === "ar-EG" ? 1 : 0] ?? translate("unknown", locale) : "";
}
