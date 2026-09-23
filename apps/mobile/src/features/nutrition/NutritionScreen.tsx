import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppButton, AppTextField, CinematicHero, DirectionalText as Text, MotionReveal } from "../../core/components";
import { colors, fonts, radii, spacing } from "../../core/theme/tokens";
import { getMyProfile } from "../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../auth/components/CoachingUI";
import {
  confirmFood, getFoodLogs, getTodayFoodLogs, previewFood, previewFoodPhoto,
  type FoodPreview, type LocalFoodPhoto,
} from "./api";
import type { FoodLog, MealType } from "./types";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const labels = {
  breakfast: ["Breakfast", "إفطار"], lunch: ["Lunch", "غداء"],
  dinner: ["Dinner", "عشاء"], snack: ["Snack", "وجبة خفيفة"],
} as const;

export function NutritionScreen() {
  const client = useQueryClient();
  const busy = useRef(false);
  const [preview, setPreview] = useState<FoodPreview | null>(null);
  const [photo, setPhoto] = useState<LocalFoodPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const logs = useQuery({ queryFn: getTodayFoodLogs, queryKey: ["nutrition", "logs", "today"] });
  const history = useQuery({ queryFn: () => getFoodLogs(50), queryKey: ["nutrition", "logs", "recent"] });
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("snack");
  const olderLogs = useMemo(() => {
    const todayIds = new Set(logs.data?.map(item => item.id) ?? []);
    return history.data?.filter(item => !todayIds.has(item.id)).slice(0, 20) ?? [];
  }, [history.data, logs.data]);

  const mutation = useMutation({
    mutationFn: () => photo ? previewFoodPhoto(photo, description.trim(), mealType) : previewFood(description.trim(), mealType),
    onSuccess: result => {
      setPreview(result);
      if (photo && description.trim().length < 3) setDescription(arabic ? "صورة وجبة" : "Meal photo");
    },
  });
  const confirm = useMutation({
    mutationFn: () => confirmFood(preview!, description.trim(), mealType),
    onSuccess: async () => {
      setDescription("");
      setPhoto(null);
      setPreview(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["nutrition", "logs"] }),
        client.invalidateQueries({ queryKey: ["nutrition", "today"] }),
      ]);
    },
  });

  async function choosePhoto(camera: boolean) {
    setPhotoError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(arabic ? "يلزم السماح بالوصول لاختيار صورة الوجبة." : "Allow access to choose a meal photo.");
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, mediaTypes: ["images"], quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ["images"], quality: 0.75 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `meal-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
      file: asset.file ?? undefined,
    });
    setPreview(null);
    mutation.reset();
  }

  const canAnalyze = Boolean(photo) || description.trim().length >= 3;

  return <CoachingPage arabic={arabic}>
    <CinematicHero arabic={arabic} source={require("../../../assets/heroes/nutrition.jpg")} title={arabic ? "غذّي مهمتك" : "Fuel your mission"} subtitle={arabic ? "حلّل وجبتك وراجع كل تقدير قبل الحفظ." : "Analyze your meal and review every estimate before saving."} />
    <GlassCard>
      <View style={[styles.chips, arabic && styles.reverse]}>{mealTypes.map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ selected: mealType === type }} disabled={mutation.isPending || confirm.isPending || Boolean(preview)} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]}><Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{labels[type][arabic ? 1 : 0]}</Text></Pressable>)}</View>
      <AppTextField
        label={arabic ? "ماذا أكلت؟" : "What did you eat?"}
        multiline
        editable={!mutation.isPending && !confirm.isPending && !preview}
        maxLength={1000}
        onChangeText={setDescription}
        placeholder={arabic ? "مثال: 150 جم دجاج، كوب أرز وسلطة" : "Example: 150g chicken, one cup rice and salad"}
        value={description}
      />
      {!preview ? <View style={[styles.photoActions, arabic && styles.reverse]}>
        <AppButton label={arabic ? "التقاط صورة" : "Take photo"} onPress={() => void choosePhoto(true)} variant="secondary" />
        <AppButton label={arabic ? "اختيار صورة" : "Choose photo"} onPress={() => void choosePhoto(false)} variant="secondary" />
      </View> : null}
      {photo ? <View style={styles.photoPreview}>
        <Image accessibilityLabel={arabic ? "صورة الوجبة المختارة" : "Selected meal photo"} contentFit="cover" source={{ uri: photo.uri }} style={styles.photo} />
        {!preview ? <AppButton label={arabic ? "إزالة الصورة" : "Remove photo"} onPress={() => setPhoto(null)} variant="secondary" /> : null}
      </View> : null}
      {photoError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{photoError}</Text> : null}
      {!preview ? <AppButton disabled={!canAnalyze || mutation.isPending} label={mutation.isPending ? arabic ? "جاري التحليل…" : "Analyzing…" : arabic ? "تحليل الوجبة" : "Analyze meal"} onPress={() => { if (busy.current) return; busy.current = true; void mutation.mutateAsync().catch(() => {}).finally(() => { busy.current = false; }); }} /> : null}
      {mutation.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
      {mutation.isError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{arabic ? "تعذر تحليل الوجبة. احتفظنا ببياناتك؛ حاول مرة أخرى." : "The meal could not be analyzed. Your input is still here; try again."}</Text> : null}
      {preview ? <View style={ui.stack}><Text style={ui.heading}>{arabic ? "راجع التقديرات" : "Review estimates"}</Text><Text style={ui.text}>{preview.summary}</Text>{(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((key, index) => <AppTextField key={key} label={(arabic ? ["السعرات الحرارية", "البروتين · جم", "الكربوهيدرات · جم", "الدهون · جم"] : ["Calories", "Protein · g", "Carbohydrates · g", "Fat · g"])[index] ?? key} keyboardType="numeric" editable={!confirm.isPending} value={String(preview[key])} onChangeText={raw => { if (/^\d*(\.\d*)?$/.test(raw)) setPreview({ ...preview, [key]: Number(raw) }); }} />)}<AppButton label={arabic ? "تأكيد وحفظ الوجبة" : "Confirm and save meal"} loading={confirm.isPending} onPress={() => { if (busy.current) return; busy.current = true; void confirm.mutateAsync().catch(() => {}).finally(() => { busy.current = false; }); }} /><AppButton variant="secondary" disabled={confirm.isPending} label={arabic ? "تعديل البيانات أو الإلغاء" : "Edit input or cancel"} onPress={() => { setPreview(null); mutation.reset(); confirm.reset(); }} /></View> : null}
      {confirm.isError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{arabic ? "تعذر الحفظ. راجع القيم وحاول مرة أخرى." : "Could not save. Check the values and retry."}</Text> : null}
      {confirm.isSuccess ? <Text style={[ui.success, arabic && ui.rtl]}>{arabic ? "تم حفظ الوجبة وتحديث نتيجة اليوم." : "Meal saved and today's score updated."}</Text> : null}
    </GlassCard>
    <MealList arabic={arabic} isError={logs.isError} isPending={logs.isPending} items={logs.data ?? []} onRetry={() => void logs.refetch()} title={arabic ? "وجبات اليوم" : "Today's meals"} />
    {olderLogs.length > 0 || history.isPending || history.isError ? <MealList arabic={arabic} isError={history.isError} isPending={history.isPending} items={olderLogs} onRetry={() => void history.refetch()} title={arabic ? "الوجبات السابقة" : "Earlier meals"} /> : null}
  </CoachingPage>;
}

function MealList({ arabic, isError, isPending, items, onRetry, title }: { arabic: boolean; isError: boolean; isPending: boolean; items: FoodLog[]; onRetry: () => void; title: string }) {
  return <View style={ui.stack}>
    <Text style={[ui.heading, arabic && ui.rtl]}>{title}</Text>
    {isPending ? <ActivityIndicator color={colors.bronze} /> : null}
    {isError ? <AppButton label={arabic ? "إعادة المحاولة" : "Retry"} onPress={onRetry} variant="secondary" /> : null}
    {!isPending && !isError && items.length === 0 ? <GlassCard><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "لا توجد وجبات في هذه الفترة." : "No meals in this period."}</Text></GlassCard> : null}
    {items.map((item, index) => <MotionReveal delay={index * 35} key={item.id}><GlassCard><View style={[styles.logHeader, arabic && styles.reverse]}><Text style={styles.logTitle}>{labels[item.meal_type][arabic ? 1 : 0]}</Text><Text style={styles.calories}>{item.calories} {arabic ? "سعر حراري" : "kcal"}</Text></View><Text style={[ui.text, arabic && ui.rtl]} numberOfLines={3}>{item.description}</Text><Text style={[ui.small, arabic && ui.rtl]}>{arabic ? `${item.protein_g} جم بروتين · ${item.carbs_g} جم كربوهيدرات · ${item.fat_g} جم دهون` : `${item.protein_g}g P · ${item.carbs_g}g C · ${item.fat_g}g F`}</Text><Text style={[ui.small, arabic && ui.rtl]}>{item.summary}</Text></GlassCard></MotionReveal>)}
  </View>;
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
  photo: { aspectRatio: 4 / 3, borderRadius: radii.card, width: "100%" },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoPreview: { gap: spacing.sm },
  reverse: { flexDirection: "row-reverse" },
});
