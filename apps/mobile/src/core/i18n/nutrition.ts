import type {Locale} from "./messages";
const meals = {breakfast: ["Breakfast", "الفطار"], lunch: ["Lunch", "الغدا"], dinner: ["Dinner", "العشا"], snack: ["Snack", "وجبة خفيفة"]} as const;
const macros = {calories: ["Calories", "السعرات الحرارية"], protein_g: ["Protein · g", "البروتين · جم"], carbs_g: ["Carbohydrates · g", "الكربوهيدرات · جم"], fat_g: ["Fat · g", "الدهون · جم"]} as const;
export function mealLabel(key: keyof typeof meals, locale: Locale) {return meals[key][locale === "ar-EG" ? 1 : 0];}
export function macroLabel(key: keyof typeof macros, locale: Locale) {return macros[key][locale === "ar-EG" ? 1 : 0];}
export function narrativeMatchesLocale(text: string, locale: Locale) {
  const letters = Array.from(text).filter(letter => /\p{L}/u.test(letter));
  const arabic = letters.filter(letter => /[\u0600-\u06ff]/.test(letter)).length;
  return letters.length > 0 && (locale === "ar-EG" ? arabic / letters.length >= 0.25 : arabic === 0);
}
