import {formatNumber, translate, type Locale} from "./messages";

const labels = {
  barbell: ["Barbell", "بار"], dumbbell: ["Dumbbells", "دامبل"], bodyweight: ["Bodyweight", "وزن الجسم"],
  machine: ["Machine", "جهاز"], cable: ["Cable", "كابل"], bands: ["Resistance bands", "أشرطة مقاومة"], band: ["Resistance band", "شريط مقاومة"],
  weighted: ["Added weight", "بوزن إضافي"], assisted: ["Assisted", "بمساعدة"], kettlebell: ["Kettlebell", "كيتل بيل"], leverage_machine: ["Leverage machine", "جهاز مقاومة"],
  "leverage machine": ["Leverage machine", "جهاز مقاومة"], "smith machine": ["Smith machine", "جهاز سميث"], "stability ball": ["Stability ball", "كرة توازن"],
  "medicine ball": ["Medicine ball", "كرة طبية"], "ez barbell": ["EZ barbell", "بار متعرج"], "olympic barbell": ["Olympic barbell", "بار أوليمبي"],
  chest: ["Chest", "الصدر"], pectorals: ["Chest", "الصدر"], back: ["Back", "الظهر"], lats: ["Lats", "عضلات الظهر الجانبية"],
  "upper back": ["Upper back", "أعلى الظهر"], "lower back": ["Lower back", "أسفل الظهر"], spine: ["Spinal muscles", "عضلات الظهر"],
  shoulders: ["Shoulders", "الكتف"], delts: ["Shoulders", "الكتف"], biceps: ["Biceps", "البايسبس"], triceps: ["Triceps", "الترايسبس"],
  quads: ["Quadriceps", "عضلات الفخذ الأمامية"], quadriceps: ["Quadriceps", "عضلات الفخذ الأمامية"], hamstrings: ["Hamstrings", "عضلات الفخذ الخلفية"],
  glutes: ["Glutes", "عضلات المؤخرة"], calves: ["Calves", "السمانة"], abs: ["Abs", "عضلات البطن"], core: ["Core", "عضلات البطن"],
  forearms: ["Forearms", "الساعد"], traps: ["Trapezius", "الترابيس"], abductors: ["Hip abductors", "عضلات الفخذ الخارجية"], adductors: ["Hip adductors", "عضلات الفخذ الداخلية"],
  "upper arms": ["Upper arms", "الذراع"], "lower arms": ["Forearms", "الساعد"], "upper legs": ["Upper legs", "الفخذ"], "lower legs": ["Lower legs", "أسفل الرجل"],
  neck: ["Neck", "الرقبة"], cardio: ["Cardio", "لياقة القلب والتنفس"], full_body: ["Full body", "الجسم كله"],
} as const;
export function fitnessLabel(value: string, locale: Locale, kind: "muscle" | "equipment" = "muscle") {
  const key = value.toLowerCase() as keyof typeof labels;
  return labels[key]?.[locale === "ar-EG" ? 1 : 0] ?? (locale === "en" ? value.replaceAll("_", " ") : translate(kind === "muscle" ? "otherMuscle" : "otherEquipment", locale));
}
export function weightFromKg(kg: number, imperial: boolean) {return imperial ? kg * 2.2046226218 : kg;}
export function weightToKg(value: number, imperial: boolean) {return imperial ? value / 2.2046226218 : value;}
export function weightLabel(kg: number, locale: Locale, imperial: boolean) {return `${formatNumber(weightFromKg(kg, imperial), locale, {maximumFractionDigits: 1})} ${translate(imperial ? "pound" : "kilogram", locale)}`;}
