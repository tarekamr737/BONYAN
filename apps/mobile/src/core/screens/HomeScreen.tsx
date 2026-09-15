import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { CoachingPage, GlassCard, ProgressMeter, ui } from "../../features/auth/components/CoachingUI";
import { goalLabel } from "../../features/auth/journey";
import { getDailyDashboard } from "../../features/nutrition/api";
import { AppButton, AvatarJourneyCard, BrandMark, MotionReveal, NotificationBell, ProfileAvatar } from "../components";
import { DirectionalText as Text } from "../components/DirectionalText";
import { useAppNotifications } from "../notifications/useAppNotifications";
import { colors, fonts, radii, spacing } from "../theme/tokens";

const recentDestinations = [
  { href: "/profile", icon: "user", en: "Profile and assessment history", ar: "الملف وسجل التقييمات" },
  { href: "/inbody", icon: "file-plus", en: "Add an InBody report", ar: "إضافة تقرير InBody" },
  { href: "/community", icon: "users", en: "Training community", ar: "مجتمع التدريب" },
] as const;

export function HomeScreen() {
  const state = useAppNotifications();
  const { arabic, assessment, avatars, profile } = state;
  const daily = useQuery({ queryFn: getDailyDashboard, queryKey: ["nutrition", "today"] });
  const profileButton = <ProfileAvatar accessibilityLabel={arabic ? "فتح ملفي" : "Open my profile"} displayName={profile.data?.display_name} hasPhoto={profile.data?.has_profile_photo} onPress={() => router.push("/profile")} photoUpdatedAt={profile.data?.profile_photo_updated_at} size={54} />;
  const accountTools = <View style={styles.accountTools}><NotificationBell arabic={arabic} count={state.requiresActionCount} onPress={() => router.push("/notifications")} />{profileButton}</View>;

  return <CoachingPage arabic={arabic}>
    <View style={styles.header}>{arabic ? accountTools : <BrandMark />}{arabic ? <BrandMark /> : accountTools}</View>
    <View style={styles.intro}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{profile.data?.display_name ? `${arabic ? "أهلًا،" : "Hello,"} ${profile.data.display_name}` : arabic ? "يومك يبدأ من هنا" : "Your day starts here."}</Text><Text style={[ui.text, arabic && ui.rtl]}>{goalLabel(profile.data?.training_goal, arabic)}</Text></View>

    <MotionReveal><GlassCard>
      <View style={[styles.scoreHeader, arabic && styles.reverse]}><View style={styles.scoreCopy}><Text style={styles.eyebrow}>{arabic ? "نتيجة اليوم" : "DAILY SCORE"}</Text><Text style={[styles.scoreTitle, arabic && ui.rtl]}>{daily.data ? arabic ? "تقدمك اليوم" : "Today's progress" : arabic ? "بنجهز ملخص يومك" : "Preparing today's view"}</Text></View>{daily.isPending ? <ActivityIndicator color={colors.bronze} /> : <Text style={styles.scoreValue}>{daily.data?.score ?? "—"}<Text style={styles.scoreMax}>/100</Text></Text>}</View>
      {daily.data ? <><ProgressMeter label={arabic ? "نتيجة اليوم" : "Daily score"} value={daily.data.score} /><View style={[styles.metrics, arabic && styles.reverse]}><Text style={ui.small}>{arabic ? `${daily.data.completed_workouts} تمرين مكتمل` : `${daily.data.completed_workouts} workout completed`}</Text><Text style={ui.small}>{arabic ? `${daily.data.meals_logged} وجبات مسجلة` : `${daily.data.meals_logged} meals logged`}</Text></View><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? dailyNextAction(daily.data.next_action) : daily.data.next_action}</Text></> : null}
      {daily.isError ? <AppButton label={arabic ? "إعادة تحميل يومي" : "Reload today"} onPress={() => void daily.refetch()} variant="secondary" /> : null}
    </GlassCard></MotionReveal>

    <View style={styles.primaryActions}>
      <Pressable accessibilityRole="button" onPress={() => router.push("/training/coach")} style={({pressed}) => [styles.heroAction, pressed && styles.pressed]}><View style={styles.heroIcon}><Feather color={colors.canvas} name="message-circle" size={24} /></View><View style={styles.actionCopy}><Text style={styles.heroTitle}>{arabic ? "تحدث مع بنيان" : "Talk to Bunyan"}</Text><Text style={styles.heroBody}>{arabic ? "اسأل عن خطتك أو تمرينك أو تقدمك" : "Ask about your plan, workout or progress"}</Text></View><Feather color={colors.canvas} name={arabic ? "arrow-left" : "arrow-right"} size={20} /></Pressable>
      <View style={[styles.secondaryActions, arabic && styles.reverse]}><HomeAction arabic={arabic} icon="edit-3" label={arabic ? "حلّل وجبة" : "Analyze food"} onPress={() => router.push("/nutrition")} /><HomeAction arabic={arabic} icon="activity" label={arabic ? "ابدأ تمرين" : "Start workout"} onPress={() => router.push("/training")} /></View>
    </View>

    <View style={styles.sectionHeading}><Text style={[ui.heading, arabic && ui.rtl]}>{arabic ? "صورتك الآن ← خطوتك القادمة" : "Current avatar → next avatar"}</Text><Text style={[ui.small, arabic && ui.rtl]}>{arabic ? "تقدم بصري مرتبط بقياساتك الحقيقية" : "Visual progress connected to your real measurements"}</Text></View>
    {avatars.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
    {avatars.isError ? <AppButton label={arabic ? "إعادة تحميل الـAvatar" : "Reload avatar"} onPress={() => void avatars.refetch()} variant="secondary" /> : null}
    {avatars.data ? <MotionReveal delay={60}><AvatarJourneyCard arabic={arabic} avatar={avatars.data.items[0]} hasAssessment={Boolean(assessment.data?.latest)} onPress={() => router.push("/avatar")} /></MotionReveal> : null}

    {state.requiresActionCount > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push("/notifications")} style={({pressed}) => [styles.attention, pressed && styles.pressed]}><Feather color={colors.bronze} name="bell" size={20} /><View style={{flex: 1}}><Text style={[styles.attentionTitle, arabic && ui.rtl]}>{arabic ? `${state.requiresActionCount} خطوات تحتاج انتباهك` : `${state.requiresActionCount} next steps need you`}</Text><Text style={[ui.small, arabic && ui.rtl]}>{arabic ? "راجع ملفك وخطتك والـAvatar" : "Review profile, plan and avatar updates"}</Text></View><Feather color={colors.bronze} name={arabic ? "chevron-left" : "chevron-right"} size={20} /></Pressable> : null}

    <View style={styles.sectionHeading}><Text style={[ui.heading, arabic && ui.rtl]}>{arabic ? "متابعة التقدم" : "Recent progress"}</Text></View>
    <View style={styles.list}>{recentDestinations.map(item => <Pressable key={item.href} accessibilityRole="button" onPress={() => router.push(item.href as Href)} style={({pressed}) => [styles.listRow, arabic && styles.reverse, pressed && styles.pressed]}><View style={styles.listIcon}><Feather color={colors.bronze} name={item.icon} size={19} /></View><Text style={[styles.listText, arabic && ui.rtl]}>{arabic ? item.ar : item.en}</Text><Feather color={colors.muted} name={arabic ? "chevron-left" : "chevron-right"} size={19} /></Pressable>)}</View>
  </CoachingPage>;
}

function HomeAction({ arabic, icon, label, onPress }: { arabic: boolean; icon: "activity" | "edit-3"; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [styles.smallAction, pressed && styles.pressed]}><Feather color={colors.bronze} name={icon} size={22} /><Text style={[styles.smallActionText, arabic && ui.rtl]}>{label}</Text></Pressable>; }
function dailyNextAction(value: string): string { if (value.startsWith("Log")) return "سجّل أو حلّل وجبة."; if (value.startsWith("Complete")) return "أكمل تمرين اليوم."; return "أنجزت خطوات اليوم الأساسية."; }

const styles = StyleSheet.create({
  accountTools: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, actionCopy: { flex: 1, gap: spacing.xxs },
  attention: { alignItems: "center", backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 72, padding: spacing.md }, attentionTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  eyebrow: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.4 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  heroAction: { alignItems: "center", backgroundColor: colors.bronze, borderRadius: radii.control, flexDirection: "row", gap: spacing.md, minHeight: 76, padding: spacing.md }, heroBody: { color: colors.canvas, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, heroIcon: { alignItems: "center", borderColor: "rgba(11,11,11,0.2)", borderRadius: 14, borderWidth: 1, height: 46, justifyContent: "center", width: 46 }, heroTitle: { color: colors.canvas, fontFamily: fonts.displaySemiBold, fontSize: 18 }, intro: { gap: spacing.xs },
  list: { borderColor: colors.line, borderRadius: radii.card, borderWidth: 1, overflow: "hidden" }, listIcon: { alignItems: "center", backgroundColor: colors.bronzeSoft, borderRadius: 12, height: 40, justifyContent: "center", width: 40 }, listRow: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 68, paddingHorizontal: spacing.md }, listText: { color: colors.text, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, pressed: { opacity: .78 }, primaryActions: { gap: spacing.sm }, reverse: { flexDirection: "row-reverse" }, scoreCopy: { flex: 1, gap: spacing.xs }, scoreHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, scoreMax: { color: colors.muted, fontFamily: fonts.displayMedium, fontSize: 18 }, scoreTitle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20 }, scoreValue: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 42, fontVariant: ["tabular-nums"], letterSpacing: -1.8 },
  secondaryActions: { flexDirection: "row", gap: spacing.sm }, sectionHeading: { gap: spacing.xs }, smallAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.control, borderWidth: 1, flex: 1, gap: spacing.sm, justifyContent: "center", minHeight: 72, padding: spacing.sm }, smallActionText: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, textAlign: "center" },
});
