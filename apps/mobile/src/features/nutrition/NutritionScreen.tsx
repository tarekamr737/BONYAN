import { phrase, phraseTemplate } from "../../core/i18n/copy";
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
      if (photo && description.trim().length < 3) setDescription(phrase("copy_c4d4dead4c85", arabic));
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
        client.invalidateQueries({ queryKey: ["game"] }),
        client.invalidateQueries({ queryKey: ["activity"] }),
      ]);
    },
  });

  async function choosePhoto(camera: boolean) {
    setPhotoError(null);
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(phrase("copy_719cbc5de964", arabic));
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, mediaTypes: ["images"], quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ["images"], quality: 0.75 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? "meal.jpg",
      type: asset.mimeType ?? "image/jpeg",
      file: asset.file ?? undefined,
    });
    setPreview(null);
    mutation.reset();
  }

  const canAnalyze = Boolean(photo) || description.trim().length >= 3;

  return <CoachingPage arabic={arabic}>
    <CinematicHero arabic={arabic} source={require("../../../assets/heroes/nutrition.jpg")} title={phrase("copy_632cbaf12d9c", arabic)} subtitle={phrase("copy_a605a39cc398", arabic)} />
    <GlassCard>
      <View style={[styles.chips, arabic && styles.reverse]}>{mealTypes.map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ selected: mealType === type }} disabled={mutation.isPending || confirm.isPending || Boolean(preview)} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipActive]}><Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{labels[type][arabic ? 1 : 0]}</Text></Pressable>)}</View>
      <AppTextField
        label={phrase("copy_b866add72ed8", arabic)}
        multiline
        editable={!mutation.isPending && !confirm.isPending && !preview}
        maxLength={1000}
        onChangeText={setDescription}
        placeholder={phrase("copy_e06ec80af9ec", arabic)}
        value={description}
      />
      {!preview ? <View style={[styles.photoActions, arabic && styles.reverse]}>
        <AppButton label={phrase("copy_c1eccfdc1398", arabic)} onPress={() => void choosePhoto(true)} variant="secondary" />
        <AppButton label={phrase("copy_bc69feee80d2", arabic)} onPress={() => void choosePhoto(false)} variant="secondary" />
      </View> : null}
      {photo ? <View style={styles.photoPreview}>
        <Image accessibilityLabel={phrase("copy_c362b239ecc2", arabic)} contentFit="cover" source={{ uri: photo.uri }} style={styles.photo} />
        {!preview ? <AppButton label={phrase("copy_c49f0f03e483", arabic)} onPress={() => setPhoto(null)} variant="secondary" /> : null}
      </View> : null}
      {photoError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{photoError}</Text> : null}
      {!preview ? <AppButton disabled={!canAnalyze || mutation.isPending} label={mutation.isPending ? phrase("copy_f747b5b1d694", arabic) : phrase("copy_20f1105438de", arabic)} onPress={() => { if (busy.current) return; busy.current = true; void mutation.mutateAsync().catch(() => {}).finally(() => { busy.current = false; }); }} /> : null}
      {mutation.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
      {mutation.isError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{phrase("copy_1d9c60d26ee1", arabic)}</Text> : null}
      {preview ? <View style={ui.stack}><Text style={ui.heading}>{phrase("copy_db14566c1ba9", arabic)}</Text><Text style={ui.text}>{preview.summary}</Text>{(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((key, index) => <AppTextField key={key} label={(arabic ? ["السعرات الحرارية", "البروتين · جم", "الكربوهيدرات · جم", "الدهون · جم"] : ["Calories", "Protein · g", "Carbohydrates · g", "Fat · g"])[index] ?? key} keyboardType="numeric" editable={!confirm.isPending} value={String(preview[key])} onChangeText={raw => { if (/^\d*(\.\d*)?$/.test(raw)) setPreview({ ...preview, [key]: Number(raw) }); }} />)}<AppButton label={phrase("copy_875edf022082", arabic)} loading={confirm.isPending} onPress={() => { if (busy.current) return; busy.current = true; void confirm.mutateAsync().catch(() => {}).finally(() => { busy.current = false; }); }} /><AppButton variant="secondary" disabled={confirm.isPending} label={phrase("copy_ab83d002fd04", arabic)} onPress={() => { setPreview(null); mutation.reset(); confirm.reset(); }} /></View> : null}
      {confirm.isError ? <Text accessibilityRole="alert" style={[ui.error, arabic && ui.rtl]}>{phrase("copy_c927efa23a67", arabic)}</Text> : null}
      {confirm.isSuccess ? <Text style={[ui.success, arabic && ui.rtl]}>{phrase("copy_105bebf81d2b", arabic)}</Text> : null}
    </GlassCard>
    <MealList arabic={arabic} isError={logs.isError} isPending={logs.isPending} items={logs.data ?? []} onRetry={() => void logs.refetch()} title={phrase("copy_f09c1ce77f75", arabic)} />
    {olderLogs.length > 0 || history.isPending || history.isError ? <MealList arabic={arabic} isError={history.isError} isPending={history.isPending} items={olderLogs} onRetry={() => void history.refetch()} title={phrase("copy_57fc5fbe722f", arabic)} /> : null}
  </CoachingPage>;
}

function MealList({ arabic, isError, isPending, items, onRetry, title }: { arabic: boolean; isError: boolean; isPending: boolean; items: FoodLog[]; onRetry: () => void; title: string }) {
  return <View style={ui.stack}>
    <Text style={[ui.heading, arabic && ui.rtl]}>{title}</Text>
    {isPending ? <ActivityIndicator color={colors.bronze} /> : null}
    {isError ? <AppButton label={phrase("copy_bb30cda7c34e", arabic)} onPress={onRetry} variant="secondary" /> : null}
    {!isPending && !isError && items.length === 0 ? <GlassCard><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_0c2e371ce4c5", arabic)}</Text></GlassCard> : null}
    {items.map((item, index) => <MotionReveal delay={index * 35} key={item.id}><GlassCard><View style={[styles.logHeader, arabic && styles.reverse]}><Text style={styles.logTitle}>{labels[item.meal_type][arabic ? 1 : 0]}</Text><Text style={styles.calories}>{item.calories} {phrase("copy_51773b42039e", arabic)}</Text></View><Text style={[ui.text, arabic && ui.rtl]} numberOfLines={3}>{item.description}</Text><Text style={[ui.small, arabic && ui.rtl]}>{phraseTemplate("copy_3cb181dd8f0c", arabic, (arabic) ? [item.protein_g, item.carbs_g, item.fat_g] : [item.protein_g, item.carbs_g, item.fat_g])}</Text><Text style={[ui.small, arabic && ui.rtl]}>{item.summary}</Text></GlassCard></MotionReveal>)}
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
