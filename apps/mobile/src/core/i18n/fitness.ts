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

const plans = {strength: ["Strength", "القوة"], hypertrophy: ["Build muscle", "بناء عضلات"], fat_loss: ["Fat loss", "خسارة دهون"], general_fitness: ["General fitness", "لياقة عامة"], military_preparation: ["Military preparation", "استعداد بدني عسكري"], beginner: ["Beginner", "مبتدئ"], intermediate: ["Intermediate", "متوسط"], advanced: ["Advanced", "متقدم"]} as const;
export function planLabel(value: string, arabic: boolean) {return plans[value.toLowerCase() as keyof typeof plans]?.[arabic ? 1 : 0] ?? translate("unknown", arabic ? "ar-EG" : "en");}
const workoutDays = {
  "custom workout": "تمرين مخصص", "full body": "الجسم كله", "full body a": "الجسم كله · أ", "full body b": "الجسم كله · ب",
  "upper strength": "قوة الجزء العلوي", "lower strength": "قوة الجزء السفلي", "upper": "الجزء العلوي", "lower": "الجزء السفلي",
  "upper a": "الجزء العلوي · أ", "upper b": "الجزء العلوي · ب", "lower a": "الجزء السفلي · أ", "lower b": "الجزء السفلي · ب",
  push: "تمارين الدفع", pull: "تمارين السحب", legs: "الرجل", "push a": "تمارين الدفع · أ", "push b": "تمارين الدفع · ب",
  "pull a": "تمارين السحب · أ", "pull b": "تمارين السحب · ب", "legs a": "الرجل · أ", "legs b": "الرجل · ب",
} as const;
export function workoutDayLabel(value: string | undefined, arabic: boolean) {
  if (!value) return translate("train", arabic ? "ar-EG" : "en");
  if (!arabic) return value;
  const preparation = value.match(/^Preparation (\d+): strength endurance$/i);
  return workoutDays[value.toLowerCase() as keyof typeof workoutDays]
    ?? (preparation ? `استعداد ${formatNumber(Number(preparation[1]), "ar-EG")}: القوة والتحمّل` : /[\u0600-\u06ff]/.test(value) ? value : translate("train", "ar-EG"));
}
export function weeklyDays(value: number, arabic: boolean) {
  return arabic ? value === 1 ? "يوم واحد أسبوعيًا" : value === 2 ? "يومين أسبوعيًا" : `${formatNumber(value, "ar-EG")} أيام أسبوعيًا` : `${formatNumber(value, "en")} ${value === 1 ? "day" : "days"}/week`;
}

export function exerciseCount(value: number, locale: Locale) {
  if (locale === "en") return `${formatNumber(value, locale)} ${value === 1 ? "exercise" : "exercises"}`;
  if (value === 1) return "تمرين واحد";
  if (value === 2) return "تمرينين";
  return `${formatNumber(value, locale)} ${value >= 3 && value <= 10 ? "تمارين" : "تمرين"}`;
}
