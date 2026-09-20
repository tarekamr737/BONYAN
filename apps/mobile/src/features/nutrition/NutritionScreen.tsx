import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppButton, AppTextField, DirectionalText as Text, MotionReveal } from "../../core/components";
import { goBackOr } from "../../core/navigation/safeNavigation";
import { colors, fonts, radii, spacing } from "../../core/theme/tokens";
import { getMyProfile } from "../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../auth/components/CoachingUI";
import { previewFood, confirmFood, type FoodPreview, getTodayFoodLogs } from "./api";
import type { MealType } from "./types";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const labels = {
  breakfast: ["Breakfast", "إفطار"], lunch: ["Lunch", "غداء"],
  dinner: ["Dinner", "عشاء"], snack: ["Snack", "وجبة خفيفة"],
} as const;

export function NutritionScreen() {
  const client = useQueryClient();
  const busy = useRef(false);
  const [preview, setPreview] = useState<FoodPreview | null>(null);
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const logs = useQuery({ queryFn: getTodayFoodLogs, queryKey: ["nutrition", "logs", "today"] });
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("snack");
  const mutation = useMutation({
    mutationFn: () => previewFood(description.trim(), mealType),
    onSuccess: setPreview,
  });
  const confirm = useMutation({
    mutationFn: () => confirmFood(preview!, description.trim(), mealType),
    onSuccess: async () => {
      setDescription("");
      setPreview(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["nutrition", "logs", "today"] }),
        client.invalidateQueries({ queryKey: ["nutrition", "today"] }),
      ]);
    },
  });
  return <CoachingPage arabic={arabic}>
    <Pressable accessibilityRole="button" onPress={() => goBackOr("/")} style={styles.back}>
      <Feather color={colors.bronze} name={arabic ? "arrow-right" : "arrow-left"} size={20} />
      <Text style={styles.backText}>{arabic ? "الرئيسية" : "Home"}</Text>
    </Pressable>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{arabic ? "حلّل وجبتك" : "Analyze food"}</Text>
      <Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "اكتب مكونات الوجبة والكميات التقريبية. راجع التقديرات وعدّلها قبل الحفظ." : "Describe the meal and approximate portions. Review and edit the estimate before saving."}</Text>
    </View>
    <GlassCard>
      <View style={[styles.chips, arabic && styles.reverse]}>{mealTypes.map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{selected: mealType === type}} disabled={mutation.isPending || confirm.isPending || Boolean(preview)} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]}><Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{labels[type][arabic ? 1 : 0]}</Text></Pressable>)}</View>
      <AppTextField
        label={arabic ? "ماذا أكلت؟" : "What did you eat?"}
        multiline
        editable={!mutation.isPending && !confirm.isPending && !preview}
        maxLength={1000}
        onChangeText={setDescription}
        placeholder={arabic ? "مثال: 150 جم دجاج، كوب أرز وسلطة" : "Example: 150g chicken, one cup rice and salad"}
        value={description}
      />
      {!preview ? <AppButton disabled={description.trim().length < 3 || mutation.isPending} label={mutation.isPending ? arabic ? "جاري التحليل…" : "Analyzing…" : arabic ? "تحليل الوجبة" : "Analyze meal"} onPress={() => {if (busy.current) return; busy.current = true; void mutation.mutateAsync().catch(() => {}).finally(() => {busy.current = false;}); }} /> : null}
      {mutation.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
      {mutation.isError ? <Text style={[ui.error, arabic && ui.rtl]}>{arabic ? "تعذر تحليل الوجبة الآن. وصفك ما زال موجودًا؛ حاول مرة أخرى." : "The meal could not be analyzed. Your description is still here; try again."}</Text> : null}
      {preview ? <View style={ui.stack}><Text style={ui.heading}>{arabic ? "راجع التقديرات" : "Review estimates"}</Text><Text style={ui.text}>{preview.summary}</Text>{(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((key, index) => <AppTextField key={key} label={(arabic ? ["السعرات الحرارية", "البروتين · جم", "الكربوهيدرات · جم", "الدهون · جم"] : ["Calories", "Protein · g", "Carbohydrates · g", "Fat · g"])[index] ?? key} keyboardType="numeric" editable={!confirm.isPending} value={String(preview[key])} onChangeText={raw => {if (/^\d*(\.\d*)?$/.test(raw)) setPreview({...preview, [key]: Number(raw)});}} />)}<AppButton label={arabic ? "تأكيد وحفظ الوجبة" : "Confirm and save meal"} loading={confirm.isPending} onPress={() => {if (busy.current) return; busy.current = true; void confirm.mutateAsync().catch(() => {}).finally(() => {busy.current = false;}); }} /><AppButton variant="secondary" disabled={confirm.isPending} label={arabic ? "تعديل الوصف أو إلغاء" : "Edit description or cancel"} onPress={() => {setPreview(null); mutation.reset(); confirm.reset();}} /></View> : null}
      {confirm.isError ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذر الحفظ. راجع القيم وحاول مرة أخرى." : "Could not save. Check the values and retry."}</Text> : null}
      {confirm.isSuccess ? <Text style={[ui.success, arabic && ui.rtl]}>{arabic ? "تم حفظ الوجبة وتحديث نتيجة اليوم." : "Meal saved and today's score updated."}</Text> : null}
    </GlassCard>
    <Text style={[ui.heading, arabic && ui.rtl]}>{arabic ? "وجبات اليوم" : "Today's meals"}</Text>
    {logs.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
    {logs.isError ? <AppButton label={arabic ? "إعادة المحاولة" : "Retry"} onPress={() => void logs.refetch()} variant="secondary" /> : null}
    {!logs.isPending && logs.data?.length === 0 ? <GlassCard><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "لا توجد وجبات مسجلة اليوم. أضف أول وجبة لتبدأ متابعة يومك." : "No meals logged today. Add your first meal to start today's view."}</Text></GlassCard> : null}
    {logs.data?.map((item, index) => <MotionReveal delay={index * 35} key={item.id}><GlassCard><View style={[styles.logHeader, arabic && styles.reverse]}><Text style={styles.logTitle}>{labels[item.meal_type][arabic ? 1 : 0]}</Text><Text style={styles.calories}>{item.calories} {arabic ? "سعر حراري" : "kcal"}</Text></View><Text style={[ui.text, arabic && ui.rtl]} numberOfLines={3}>{item.description}</Text><Text style={[ui.small, arabic && ui.rtl]}>{arabic ? `${item.protein_g} جم بروتين · ${item.carbs_g} جم كربوهيدرات · ${item.fat_g} جم دهون` : `${item.protein_g}g P · ${item.carbs_g}g C · ${item.fat_g}g F`}</Text><Text style={[ui.small, arabic && ui.rtl]}>{item.summary}</Text></GlassCard></MotionReveal>)}
  </CoachingPage>;
}

const styles = StyleSheet.create({
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: spacing.xs, minHeight: 44 },
  backText: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  calories: { color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  chip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, minHeight: 42, paddingHorizontal: spacing.md, justifyContent: "center" },
  chipActive: { backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder },
  chipText: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextActive: { color: colors.bronze },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  heading: { gap: spacing.sm },
  logHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  logTitle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  reverse: { flexDirection: "row-reverse" },
});
