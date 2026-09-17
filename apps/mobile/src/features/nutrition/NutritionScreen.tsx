import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppButton, AppTextField, DirectionalText as Text, MotionReveal } from "../../core/components";
import { goBackOr } from "../../core/navigation/safeNavigation";
import { colors, fonts, radii, spacing } from "../../core/theme/tokens";
import { getMyProfile } from "../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../auth/components/CoachingUI";
import { analyzeFood, getTodayFoodLogs } from "./api";
import type { MealType } from "./types";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const labels = {
  breakfast: ["Breakfast", "إفطار"], lunch: ["Lunch", "غداء"],
  dinner: ["Dinner", "عشاء"], snack: ["Snack", "وجبة خفيفة"],
} as const;

export function NutritionScreen() {
  const client = useQueryClient();
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const logs = useQuery({ queryFn: getTodayFoodLogs, queryKey: ["nutrition", "logs", "today"] });
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("snack");
  const mutation = useMutation({
    mutationFn: () => analyzeFood(description.trim(), mealType),
    onSuccess: async () => {
      setDescription("");
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
      <Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "اكتب مكونات الوجبة والكميات التقريبية. النتيجة تقديرية وتُحفظ في يومك." : "Describe the meal and approximate portions. The estimate is saved to your day."}</Text>
    </View>
    <GlassCard>
      <View style={[styles.chips, arabic && styles.reverse]}>{mealTypes.map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{selected: mealType === type}} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]}><Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{labels[type][arabic ? 1 : 0]}</Text></Pressable>)}</View>
      <AppTextField
        label={arabic ? "ماذا أكلت؟" : "What did you eat?"}
        multiline
        onChangeText={setDescription}
        placeholder={arabic ? "مثال: 150 جم دجاج، كوب أرز وسلطة" : "Example: 150g chicken, one cup rice and salad"}
        value={description}
      />
      <AppButton disabled={description.trim().length < 3 || mutation.isPending} label={mutation.isPending ? arabic ? "جاري التحليل…" : "Analyzing…" : arabic ? "تحليل وحفظ" : "Analyze and save"} onPress={() => mutation.mutate()} />
      {mutation.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
      {mutation.isError ? <Text style={[ui.error, arabic && ui.rtl]}>{arabic ? "تعذر تحليل الوجبة الآن. وصفك ما زال موجودًا؛ حاول مرة أخرى." : "The meal could not be analyzed. Your description is still here; try again."}</Text> : null}
      {mutation.isSuccess ? <Text style={[ui.success, arabic && ui.rtl]}>{arabic ? "تم حفظ الوجبة وتحديث نتيجة اليوم." : "Meal saved and today's score updated."}</Text> : null}
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
