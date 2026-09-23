import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type ScrollView } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { updateMyProfile } from "../../features/auth/api/profileApi";
import type { UserProfile } from "../../features/auth/types";
import { AppButton } from "../components/AppButton";
import { DirectionalText as Text } from "../components/DirectionalText";
import { colors, fonts, radii, spacing } from "../theme/tokens";

export type HomeTourTarget = "daily-score" | "today-plan" | "training-tab" | "nutrition-tab" | "coach-tab" | "community-tab" | "profile";
type TargetRegistration = { node: View; scrollY?: number };
type Rect = { x: number; y: number; width: number; height: number };

const steps: { target: HomeTourTarget; en: string; ar: string }[] = [
  { target: "daily-score", en: "Daily Score combines completed training and logged meals.", ar: "نتيجة اليوم تجمع التمارين المكتملة والوجبات المسجلة." },
  { target: "today-plan", en: "Open today’s plan and continue from your next recommended action.", ar: "افتح خطة اليوم وكمل من الخطوة التالية المقترحة." },
  { target: "training-tab", en: "Your training plan, exercise library and workout history live here.", ar: "هنا خطتك التدريبية ومكتبة التمارين وسجل تدريباتك." },
  { target: "nutrition-tab", en: "Log meals and follow your nutrition targets here.", ar: "سجّل وجباتك وتابع أهداف التغذية من هنا." },
  { target: "coach-tab", en: "Ask BONYAN Coach for guidance based on your plan and progress.", ar: "اسأل كوتش بنيان عن خطتك وتقدمك." },
  { target: "community-tab", en: "Train with the BONYAN community and follow shared challenges.", ar: "تدرّب مع مجتمع بنيان وتابع التحديات المشتركة." },
  { target: "profile", en: "Your profile stores settings, history and the option to replay this tour.", ar: "ملفك يحفظ الإعدادات والسجل وخيار إعادة الجولة." },
];

type TourContextValue = {
  registerTarget: (id: HomeTourTarget, node: View | null, scrollY?: number) => void;
  setHomeScroller: (scroll: ScrollView | null) => void;
};

const HomeTourContext = createContext<TourContextValue>({ registerTarget: () => {}, setHomeScroller: () => {} });
export function useHomeTour() { return useContext(HomeTourContext); }

export function HomeTourProvider({ children, profile, arabic }: PropsWithChildren<{profile: UserProfile; arabic: boolean}>) {
  const pathname = usePathname();
  const client = useQueryClient();
  const targets = useRef(new Map<HomeTourTarget, TargetRegistration>());
  const scroller = useRef<ScrollView | null>(null);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const enabled = pathname === "/" && !profile.home_tour_completed;
  const finish = useMutation({
    mutationFn: () => updateMyProfile({ home_tour_completed: true }),
    onSuccess: updated => { client.setQueryData(["profile", "me"], updated); setRect(null); setStep(0); },
  });

  const registerTarget = useCallback((id: HomeTourTarget, node: View | null, scrollY?: number) => {
    if (node) targets.current.set(id, { node, scrollY });
    else targets.current.delete(id);
  }, []);
  const setHomeScroller = useCallback((scroll: ScrollView | null) => { scroller.current = scroll; }, []);

  const measureCurrent = useCallback(() => {
    const registration = targets.current.get(steps[step]!.target);
    if (!registration) { setRect(null); return; }
    registration.node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setRect({ x, y, width, height });
    });
  }, [step]);

  useEffect(() => {
    if (!enabled) return;
    const registration = targets.current.get(steps[step]!.target);
    if (registration?.scrollY !== undefined) {
      scroller.current?.scrollTo({ y: Math.max(0, registration.scrollY - 92), animated: true });
    } else if (steps[step]!.target === "profile") {
      scroller.current?.scrollTo({ y: 0, animated: true });
    }
    const first = setTimeout(measureCurrent, registration?.scrollY !== undefined || steps[step]!.target === "profile" ? 360 : 40);
    const retry = setTimeout(measureCurrent, 620);
    return () => { clearTimeout(first); clearTimeout(retry); };
  }, [enabled, measureCurrent, step]);

  const value = useMemo(() => ({ registerTarget, setHomeScroller }), [registerTarget, setHomeScroller]);
  return <HomeTourContext.Provider value={value}>{children}{enabled && rect ? <HomeTourOverlay arabic={arabic} busy={finish.isPending} onBack={() => {setRect(null); setStep(v => Math.max(0, v - 1));}} onFinish={() => finish.mutate()} onNext={() => {if (step === steps.length - 1) finish.mutate(); else {setRect(null); setStep(v => v + 1);}}} rect={rect} step={step} /> : null}</HomeTourContext.Provider>;
}

function HomeTourOverlay({ arabic, busy, onBack, onFinish, onNext, rect, step }: {arabic: boolean; busy: boolean; onBack: () => void; onFinish: () => void; onNext: () => void; rect: Rect; step: number}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [tooltipHeight, setTooltipHeight] = useState(170);
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(0);
    opacity.set(withTiming(1, { duration: reducedMotion ? 80 : 180, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: ReduceMotion.System }));
  }, [opacity, rect, reducedMotion, step]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const pad = 6;
  const hole = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: Math.min(screenWidth, rect.width + pad * 2), height: Math.min(screenHeight, rect.height + pad * 2) };
  const holeStyle = { left: hole.x, top: hole.y, width: hole.width, height: hole.height };
  const tooltipWidth = Math.min(340, screenWidth - 28);
  const placeBelow = hole.y + hole.height + tooltipHeight + 24 < screenHeight;
  const tooltipTop = placeBelow ? hole.y + hole.height + 12 : Math.max(12, hole.y - tooltipHeight - 12);
  const tooltipLeft = Math.min(screenWidth - tooltipWidth - 14, Math.max(14, hole.x + hole.width / 2 - tooltipWidth / 2));
  const dim = "rgba(0,0,0,0.78)";
  return <Animated.View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.overlay, animatedStyle]}>
    <View style={[styles.blocker, { backgroundColor: dim, left: 0, right: 0, top: 0, height: hole.y }]} />
    <View style={[styles.blocker, { backgroundColor: dim, left: 0, top: hole.y, width: hole.x, height: hole.height }]} />
    <View style={[styles.blocker, { backgroundColor: dim, left: hole.x + hole.width, right: 0, top: hole.y, height: hole.height }]} />
    <View style={[styles.blocker, { backgroundColor: dim, left: 0, right: 0, top: hole.y + hole.height, bottom: 0 }]} />
    <Pressable accessibilityLabel={arabic ? "العنصر المحدد" : "Highlighted item"} style={[styles.holeBlocker, holeStyle]} />
    <View pointerEvents="none" style={[styles.highlight, holeStyle]} />
    <View onLayout={event => setTooltipHeight(event.nativeEvent.layout.height)} style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop, width: tooltipWidth }]}>
      <Text style={[styles.kicker, arabic && styles.rtl]}>{arabic ? `جولة بنيان · ${step + 1}/${steps.length}` : `BONYAN tour · ${step + 1}/${steps.length}`}</Text>
      <Text style={[styles.copy, arabic && styles.rtl]}>{arabic ? steps[step]!.ar : steps[step]!.en}</Text>
      <View style={[styles.actions, arabic && styles.reverse]}>
        <AppButton disabled={step === 0 || busy} label={arabic ? "السابق" : "Back"} onPress={onBack} variant="secondary" />
        <AppButton loading={busy} label={step === steps.length - 1 ? arabic ? "إنهاء" : "Finish" : arabic ? "التالي" : "Next"} onPress={onNext} />
        <Pressable disabled={busy} hitSlop={10} onPress={onFinish}><Text style={styles.skip}>{arabic ? "تخطي" : "Skip"}</Text></Pressable>
      </View>
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  blocker: { position: "absolute" },
  copy: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  highlight: { borderColor: colors.bronze, borderRadius: radii.control + 3, borderWidth: 2, elevation: 10, position: "absolute", shadowColor: colors.bronze, shadowOpacity: 0.5, shadowRadius: 12 },
  holeBlocker: { position: "absolute" },
  kicker: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.7 },
  overlay: { elevation: 1000, zIndex: 1000 },
  reverse: { flexDirection: "row-reverse" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  skip: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 12, padding: spacing.xs },
  tooltip: { backgroundColor: colors.surfaceRaised, borderColor: colors.bronzeBorder, borderRadius: radii.card, borderWidth: 1, gap: spacing.sm, padding: spacing.md, position: "absolute" },
});
