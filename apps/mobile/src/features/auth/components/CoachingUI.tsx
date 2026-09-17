import { DirectionalText as Text , LanguageDirection } from "../../../core/components/DirectionalText";
import { coachingCopy } from "../coachingCopy";
import { useEffect, useRef, type ComponentProps, type PropsWithChildren, type ReactNode } from "react";
import Feather from "@expo/vector-icons/Feather";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassBackdrop, GlassSurface } from "../../../core/components/GlassSurface";

import { colors, fonts, spacing } from "../../../core/theme/tokens";
import type { CoachingScore } from "../types";
import { dimensionLabel } from "../journey";

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: "100%", maxWidth: 660, alignSelf: "center", padding: spacing.lg, paddingBottom: 48, gap: 24, flexGrow: 1 },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  heading: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 21, lineHeight: 28 },
  text: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  stack: { gap: 16 },
  glass: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 22, gap: 16 },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  success: { color: colors.positive, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden" },
});

export function CoachingPage({ children, arabic = false, footer, step }: PropsWithChildren<{arabic?: boolean; footer?: ReactNode; step?: string}>) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {scroll.current?.scrollTo({y: 0, animated: false});}, [step]);
  return <LanguageDirection.Provider value={arabic}><SafeAreaView edges={["top", "left", "right"]} style={ui.page}><GlassBackdrop /><KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={ui.content}>{children}</ScrollView>
    {footer ? <View style={{borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 12}}><View style={{width: "100%", maxWidth: 612, alignSelf: "center", gap: 8}}>{footer}</View></View> : null}
  </KeyboardAvoidingView></SafeAreaView></LanguageDirection.Provider>;
}

export function GlassCard({children}: PropsWithChildren) { return <GlassSurface style={{gap: 16}}>{children}</GlassSurface>; }

export function SelectableCard({ title, description, selected, onPress, arabic = false, disabled = false, icon }: {title: string; description?: string; selected: boolean; onPress: () => void; arabic?: boolean; disabled?: boolean; icon?: ComponentProps<typeof Feather>["name"]}) {
  return <Pressable accessibilityRole="radio" accessibilityState={{selected, disabled}} onPress={onPress} disabled={disabled}
    style={({pressed}) => [ui.glass, {minHeight: 68, padding: 18, backgroundColor: selected ? colors.bronzeSoft : colors.surface, borderColor: selected ? colors.bronze : colors.line, opacity: disabled ? .5 : pressed ? .8 : 1, transform: [{scale: pressed ? .99 : 1}]}]}>
    <View style={{flexDirection: arabic ? "row-reverse" : "row", alignItems: "center", gap: 14}}>
      {icon ? <View style={{width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.bronzeSoft : colors.surfaceRaised}}><Feather name={icon} size={21} color={selected ? colors.bronze : colors.mutedLight} /></View> : null}
      <View style={{flex: 1, gap: 5}}><Text style={[ui.heading, {fontSize: 16, lineHeight: 23}, arabic && ui.rtl]}>{title}</Text>
      {description ? <Text style={[ui.text, {fontSize: 13, lineHeight: 20}, arabic && ui.rtl]}>{description}</Text> : null}</View>
      <Feather name={selected ? "check-circle" : "circle"} size={19} color={selected ? colors.bronze : colors.muted} />
    </View>
  </Pressable>;
}

export function StepReveal({step, children}: PropsWithChildren<{step: string}>) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(reducedMotion ? 1 : 0);
    if (!reducedMotion) {
      progress.set(withTiming(1, { duration: 180, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: ReduceMotion.System }));
    }
  }, [progress, reducedMotion, step]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ translateY: (1 - progress.get()) * 8 }] }));
  return <Animated.View style={[ui.stack, animatedStyle]}>{children}</Animated.View>;
}

export function ProgressMeter({value, label}: {value: number; label: string}) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(value, { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: ReduceMotion.System }));
  }, [fill, value]);
  const animatedStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(100, fill.get()))}%` as `${number}%` }));
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min: 0, max: 100, now: value}} style={ui.track}>
    <Animated.View style={[{height: 4, backgroundColor: colors.bronze}, animatedStyle]} />
  </View>;
}

export function ScoreCard({score, arabic = false}: {score: CoachingScore; arabic?: boolean}) {
  return <GlassCard><View style={ui.row}><Text style={[ui.heading, {flex: 1}]}>{arabic ? "التقدم نحو أهدافك" : "Your target progress"}</Text><Text style={[ui.title, {color: colors.bronze}]}>{score.value === null ? "—" : `${score.value}/100`}</Text></View>
    <Text style={ui.small}>{arabic ? "مؤشر إرشادي حسب أهدافك الشخصية، وليس تقييمًا طبيًا أو معيار قبول عسكري." : "A coaching indicator against your personal targets. Not a medical assessment or military admission standard."}</Text>
    {score.dimensions.map(d => <View key={d.key} style={{gap: 8}}><View style={ui.row}><Text style={[ui.text, {flex: 1}]}>{coachingCopy(dimensionLabel[d.key] ?? d.key, arabic)}</Text><Text style={ui.text}>{d.value}%</Text></View><ProgressMeter value={d.value} label={coachingCopy(dimensionLabel[d.key] ?? d.key, arabic)} /><Text style={ui.small}>{coachingCopy(d.basis, arabic)}</Text></View>)}
    <Text style={ui.small}>{score.coverage}% {arabic ? "من عناصر التقييم متاحة" : "of score inputs available"}. {score.missing.map(k => coachingCopy(dimensionLabel[k] ?? k, arabic)).join(" · ")}</Text>
    {score.strongest ? <Text style={ui.text}>{coachingCopy("Strongest", arabic)}: {coachingCopy(dimensionLabel[score.strongest] ?? "", arabic)}. {coachingCopy("Next focus", arabic)}: {coachingCopy(dimensionLabel[score.improve ?? ""] ?? "", arabic)}.</Text> : null}
    <Text style={ui.text}>{coachingCopy(score.recommendation, arabic)}</Text>
  </GlassCard>;
}
