import { Image } from "expo-image";
import { useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { AppButton, BrandMark } from "../../../core/components";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { storeIntroCompleted } from "../../../core/auth/introStorage";
import { colors, spacing } from "../../../core/theme/tokens";
import { CoachingPage, ui } from "../components/CoachingUI";
import { introSlides } from "../introSlides";

const images = {
  running: require("../../../../assets/intro/running.jpg"),
  pushups: require("../../../../assets/intro/pushups.jpg"),
  pullups: require("../../../../assets/intro/pullups.jpg"),
  gym: require("../../../../assets/intro/gym.jpg"),
  planning: require("../../../../assets/intro/planning.jpg"),
  coach: require("../../../../assets/intro/coach.jpg"),
  nutrition: require("../../../../assets/intro/nutrition.jpg"),
  progress: require("../../../../assets/intro/progress.jpg"),
};

export function IntroScreen({ onComplete }: { onComplete: (register: boolean, arabic: boolean) => void }) {
  const [page, setPage] = useState(0);
  const [arabic, setArabic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const slide = introSlides[page]!;
  const last = page === introSlides.length - 1;
  const gesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy) * 2,
    onPanResponderRelease: (_, { dx }) => {
      if (Math.abs(dx) > 40 && !saving) setPage(current => Math.max(0, Math.min(introSlides.length - 1, current + ((arabic ? dx > 0 : dx < 0) ? 1 : -1))));
    },
  });
  async function finish(register: boolean) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(false);
    try { await storeIntroCompleted(); onComplete(register, arabic); }
    catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  }
  return <CoachingPage arabic={arabic} step={String(page)}>
    <View style={styles.header}><BrandMark /><AppButton variant="secondary" label={arabic ? "English" : "العربية"} disabled={saving} onPress={() => setArabic(!arabic)} /></View>
    <View {...gesture.panHandlers} style={styles.story}>
      <Image source={images[slide.image]} contentFit="cover" style={styles.image} accessibilityLabel={arabic ? slide.ar : slide.en} />
      {slide.image === "nutrition" ? <Image source={images.coach} contentFit="cover" style={styles.image} accessibilityLabel={arabic ? "دعم الكوتش لتمرينك" : "Coaching support for training"} /> : null}
      <Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{arabic ? slide.ar : slide.en}</Text>
      <Text style={[ui.text, arabic && ui.rtl]}>{arabic ? slide.bodyAr : slide.body}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel={arabic ? "مقدمة بنيان" : "Bonyan introduction"} accessibilityValue={{ min: 1, max: introSlides.length, now: page + 1 }} style={[styles.indicators, arabic && styles.reverse]}>
      {introSlides.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.current]} />)}
    </View>
    <Text style={ui.small}>{page + 1} / {introSlides.length}</Text>
    {error ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذر حفظ اختيارك. جرّب مرة تانية." : "Could not save your choice. Please try again."}</Text> : null}
    <AppButton label={last ? arabic ? "ابدأ الآن" : "Get started" : arabic ? "التالي" : "Next"} loading={saving} onPress={() => last ? void finish(true) : setPage(page + 1)} />
    {last ? <AppButton variant="secondary" label={arabic ? "لدي حساب بالفعل" : "I already have an account"} disabled={saving} onPress={() => void finish(false)} /> : <AppButton variant="secondary" label={arabic ? "تخطي المقدمة" : "Skip introduction"} disabled={saving} onPress={() => void finish(false)} />}
    {page > 0 ? <AppButton variant="secondary" label={arabic ? "رجوع" : "Back"} disabled={saving} onPress={() => setPage(page - 1)} /> : null}
  </CoachingPage>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  story: { gap: spacing.lg },
  image: { width: "100%", aspectRatio: 1.5, borderRadius: 16, backgroundColor: colors.surface },
  indicators: { flexDirection: "row", gap: spacing.xs },
  reverse: { flexDirection: "row-reverse" },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  current: { backgroundColor: colors.bronze },
});
