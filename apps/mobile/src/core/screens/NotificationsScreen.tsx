import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CoachingPage, GlassCard, ui } from "../../features/auth/components/CoachingUI";
import { AppButton, BrandMark } from "../components";
import { MotionReveal } from "../components/MotionReveal";
import { goBackOr } from "../navigation/safeNavigation";
import { useAppNotifications } from "../notifications/useAppNotifications";
import { colors } from "../theme/tokens";
import { DirectionalText as Text } from "../components/DirectionalText";

export function NotificationsScreen() {
  const state = useAppNotifications();
  const pending = state.profile.isPending || state.assessment.isPending || state.plan.isPending || state.avatars.isPending;
  const hasError = state.profile.isError || state.assessment.isError || state.plan.isError || state.avatars.isError;
  return (
    <CoachingPage arabic={state.arabic}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
        <Pressable accessibilityLabel={state.arabic ? "رجوع" : "Back"} accessibilityRole="button" hitSlop={8} onPress={() => goBackOr("/")} style={({ pressed }) => ({ alignItems: "center", backgroundColor: colors.surfaceRaised, borderColor: colors.line, borderRadius: 16, borderWidth: 1, height: 48, justifyContent: "center", opacity: pressed ? 0.72 : 1, width: 48 })}>
          <Feather color={colors.text} name={state.arabic ? "arrow-right" : "arrow-left"} size={21} />
        </Pressable>
        <BrandMark />
      </View>
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={[ui.title, state.arabic && ui.rtl]}>{state.arabic ? "مركز المتابعة" : "Your updates"}</Text>
        <Text style={[ui.text, state.arabic && ui.rtl]}>{state.arabic ? "خطوات مهمة من ملفك وخطتك والـAvatar في مكان واحد." : "Useful next steps from your profile, plan and avatar in one place."}</Text>
      </View>
      {pending ? <GlassCard><ActivityIndicator color={colors.bronze} /><Text style={ui.text}>{state.arabic ? "نراجع آخر تحديثاتك…" : "Checking your latest updates…"}</Text></GlassCard> : null}
      {hasError ? <AppButton label={state.arabic ? "إعادة المحاولة" : "Try again"} onPress={() => void state.refetch()} variant="secondary" /> : null}
      {!pending && state.notifications.length === 0 ? <GlassCard><Feather color={colors.positive} name="check-circle" size={28} /><Text style={ui.heading}>{state.arabic ? "كل شيء مضبوط" : "You are all caught up"}</Text><Text style={ui.text}>{state.arabic ? "لا توجد خطوات مطلوبة الآن." : "There are no actions waiting for you right now."}</Text></GlassCard> : null}
      {!pending ? state.notifications.map((item, index) => (
        <MotionReveal delay={Math.min(index * 45, 180)} key={item.id}>
          <Pressable accessibilityRole="button" onPress={() => router.push(item.href)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
            <GlassCard>
              <View style={{ alignItems: "center", flexDirection: state.arabic ? "row-reverse" : "row", gap: 12 }}>
                <View style={{ alignItems: "center", backgroundColor: item.requiresAction ? colors.bronzeSoft : colors.surfaceRaised, borderRadius: 14, height: 44, justifyContent: "center", width: 44 }}><Feather color={item.requiresAction ? colors.bronze : colors.positive} name={item.icon} size={21} /></View>
                <View style={{ flex: 1, gap: 5 }}><Text style={[ui.heading, { fontSize: 17, lineHeight: 23 }, state.arabic && ui.rtl]}>{item.title}</Text><Text style={[ui.text, { fontSize: 13, lineHeight: 20 }, state.arabic && ui.rtl]}>{item.body}</Text></View>
              </View>
              <Text style={[ui.small, { color: colors.bronze }, state.arabic && ui.rtl]}>{item.actionLabel} {state.arabic ? "←" : "→"}</Text>
            </GlassCard>
          </Pressable>
        </MotionReveal>
      )) : null}
    </CoachingPage>
  );
}
