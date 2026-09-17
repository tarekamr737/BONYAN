import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { coachingCopy } from "../coachingCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, View } from "react-native";

import { AppButton, AppTextField } from "../../../core/components";
import { readCoachingDraft, storeCoachingDraft } from "../../../core/auth/draftStorage";
import { getAssessment, updateMyProfile } from "../api/profileApi";
import { cleanCoaching, goalLabel, goalOptions, journeySteps, type JourneyStep } from "../journey";
import { shouldStepBack } from "../journeyNavigation";
import { profileDraftToUpdate, profileToDraft, validateProfileDraft, type ProfileDraft } from "../profileDraft";
import type { CoachingPreferences, UserProfile } from "../types";
import { AssessmentEditor } from "./AssessmentEditor";
import { CoachingPage, GlassCard, ScoreCard, SelectableCard, StepReveal, ProgressMeter, ui } from "./CoachingUI";
import { PerformanceFields, performanceError } from "./PerformanceFields";

type SavedDraft = {draft: ProfileDraft; coaching: CoachingPreferences; step: JourneyStep};

export function CoachingJourney({profile, editing = false, onDone}: {profile: UserProfile; editing?: boolean; onDone?: () => void}) {
  const client = useQueryClient();
  const navigation = useNavigation();
  const stored = client.getQueryData<SavedDraft>(["onboarding-draft"]);
  const [draft, setDraft] = useState(stored?.draft ?? profileToDraft(profile));
  const [coaching, setCoaching] = useState<CoachingPreferences>(stored?.coaching ?? profile.coaching ?? {});
  const [step, setStep] = useState<JourneyStep>(stored?.step ?? (editing ? "name" : "welcome"));
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [details, setDetails] = useState(false);
  const [restored, setRestored] = useState(Boolean(stored));
  const busy = useRef(false);
  const arabic = draft.preferredLanguage.startsWith("ar");
  const steps = journeySteps(draft.trainingGoal);
  const position = Math.max(0, steps.indexOf(step));
  useEffect(() => navigation.addListener("beforeRemove", event => {
    if (shouldStepBack(position, complete, event.data.action.type)) { event.preventDefault(); setStep(steps[position - 1] ?? "welcome"); }
  }), [navigation, position, complete, steps]);
  useEffect(() => {
    if (complete || position === 0) return;
    if (Platform.OS !== "web") {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!shouldStepBack(position, complete)) return false;
        setStep(steps[position - 1] ?? "welcome"); return true;
      });
      return () => subscription.remove();
    }
    // Keep one same-route history entry so Back also works on a directly opened wizard.
    if (typeof window === "undefined") return;
    const guard = () => window.history.pushState({...window.history.state, bonyanJourney: true}, "", window.location.href);
    if (!window.history.state?.bonyanJourney) guard();
    const back = (event: PopStateEvent) => {
      if (!shouldStepBack(position, complete)) return;
      event.stopImmediatePropagation();
      setStep(steps[position - 1] ?? "welcome");
      if (position > 1) guard();
    };
    window.addEventListener("popstate", back, true);
    return () => window.removeEventListener("popstate", back, true);
  }, [complete, position, steps]);
  const overview = useQuery({queryKey: ["assessment"], queryFn: getAssessment});
  useEffect(() => {
    if (stored) return;
    let active = true;
    void readCoachingDraft().then(raw => {
      if (!active || !raw) return;
      const saved = JSON.parse(raw) as SavedDraft;
      if (saved.draft && saved.coaching && journeySteps(saved.draft.trainingGoal).includes(saved.step)) {
        setDraft(saved.draft); setCoaching(saved.coaching); setStep(saved.step);
      }
    }).catch(() => {}).finally(() => {if (active) setRestored(true);});
    return () => { active = false; };
  // Restore once before persisting changes from this mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored || complete) return;
    client.setQueryData(["onboarding-draft"], {draft, coaching, step});
    void storeCoachingDraft(JSON.stringify({draft, coaching, step})).catch(() => {});
  }, [draft, coaching, step, client, restored, complete, editing]);
  const save = useMutation({mutationFn: async (finish: boolean) => {
    const updated = await updateMyProfile({...profileDraftToUpdate(draft, finish ? true : profile.onboarding_completed), coaching: cleanCoaching(draft.trainingGoal, coaching)});
    if (finish) { setComplete(true); client.removeQueries({queryKey: ["onboarding-draft"]}); await storeCoachingDraft(null).catch(() => {}); }
    if (!finish || editing) client.setQueryData(["profile", "me"], updated);
    await Promise.all([client.invalidateQueries({queryKey: ["assessment"]}), client.invalidateQueries({queryKey: ["profile-history"]}), client.invalidateQueries({queryKey: ["training"]})]);
    return updated;
  }, onError: () => setError("Couldn’t save your changes. Your answers are still here. Please retry.")});
  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) { setDraft(current => ({...current, [key]: value})); setError(null); }
  const required = step === "name" ? Boolean(draft.displayName.trim()) : step === "military" ? Boolean(coaching.military_subtype) : step === "schedule" ? draft.availableEquipment.length > 0 : true;
  async function next() {
    if (busy.current || !required) return;
    busy.current = true; setError(null);
    try {
      if (step === "summary") { const invalid = validateProfileDraft(draft); if (invalid) {setError(invalid); return;} await save.mutateAsync(true); }
      else { if (["military", "focus", "schedule", "performance"].includes(step)) await save.mutateAsync(false); setStep(steps[position + 1] ?? "summary"); }
    } catch { /* Mutation renders the safe recoverable error. */ } finally {busy.current = false;}
  }
  if (!restored) return <CoachingPage><Text style={ui.text}>{coachingCopy("Loading your saved setup\u2026", arabic)}</Text></CoachingPage>;
  if (complete) return <CoachingPage arabic={arabic}><Text style={ui.title}>{arabic ? "خطوتك القادمة جاهزة" : "Your next chapter starts here."}</Text><GlassCard><Text style={ui.heading}>{draft.displayName}</Text><Text style={ui.text}>{goalLabel(draft.trainingGoal, arabic)}</Text><Text style={ui.text}>{draft.availableTrainingDays} {coachingCopy("days / week", arabic)} · {coachingCopy(draft.experienceLevel, arabic)}</Text><Text style={ui.small}>{overview.data?.latest ? (arabic ? `بيانات الجسم: ${overview.data.latest.snapshot.source === "inbody" ? "تقرير InBody" : "قياسات يدوية"}` : `Body data: ${overview.data.latest.snapshot.source}`) : (arabic ? "تقدر تضيف قياسات جسمك في أي وقت." : "Add body data whenever you’re ready.")}</Text></GlassCard>{overview.data ? <ScoreCard score={overview.data.score} arabic={arabic} /> : null}<AppButton label={arabic ? "ابدأ التدريب" : "Explore my training"} onPress={() => {client.setQueryData(["profile", "me"], save.data); onDone?.(); router.replace("/training");}} /></CoachingPage>;
  const titles: Record<JourneyStep, string> = {welcome: arabic ? "خلّي التدريب مناسب ليك" : "Training that fits your life.", name: arabic ? "نبدأ بالتعارف" : "What should we call you?", goal: arabic ? "بتتمرن علشان إيه؟" : "What are you training for?", military: arabic ? "بتستعد لأي كلية أو جهة؟" : "What are you preparing for?", focus: arabic ? "إيه الأهم ليك دلوقتي؟" : "What matters most right now?", body: arabic ? "نقطة البداية لجسمك" : "Your body. Your starting point.", experience: arabic ? "خبرتك في التدريب" : "Meet yourself where you are.", schedule: arabic ? "نظبط التدريب على أسبوعك" : "Make room for a routine.", performance: arabic ? "حدد نقطة البداية وأهدافك" : "Set a baseline, at your pace.", summary: arabic ? "راجع إعداداتك" : "A plan built around you."};
  return <CoachingPage arabic={arabic} step={step} footer={<>{error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
    <AppButton label={step === "summary" ? arabic ? "حفظ والبدء" : "Save my setup" : step === "body" && !overview.data?.latest ? arabic ? "إضافة القياسات لاحقًا" : "Add measurements later" : arabic ? "متابعة" : "Continue"} disabled={!required || (step === "performance" && performanceError(coaching))} loading={save.isPending} onPress={() => void next()} />
    <View style={ui.row}>{position > 0 ? <AppButton label={arabic ? "رجوع" : "Back"} variant="secondary" disabled={save.isPending} onPress={() => {setError(null);setStep(steps[position - 1] ?? "welcome");}} /> : null}
    {editing ? <AppButton label={coachingCopy("Close editor", arabic)} variant="secondary" onPress={onDone} /> : null}</View></>}>
    <View style={ui.row}><Text style={[ui.small, {flex: 1}]}>{arabic ? "خطوة" : "Step"} {position + 1} / {steps.length}</Text><AppButton label={arabic ? "English" : "العربية"} variant="secondary" onPress={() => update("preferredLanguage", arabic ? "en" : "ar")} /></View>
    <ProgressMeter value={(position + 1) / steps.length * 100} label={arabic ? "\u062a\u0642\u062f\u0645 \u0627\u0644\u0625\u0639\u062f\u0627\u062f" : "Setup progress"} />
    <StepReveal step={step}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{titles[step]}</Text>
    {step === "welcome" ? <GlassCard><Text style={ui.text}>{arabic ? "اختيارات قصيرة، هدف واضح، وتقييم تقدر ترجع له. تقدر تعدل إجاباتك بعدين." : "A few connected choices. A clear starting point. A history you can return to. Everything can be updated later."}</Text><Text style={ui.small}>{coachingCopy("Your reports and measurements stay private. You choose what to share.", arabic)}</Text></GlassCard> : null}
    {step === "name" ? <AppTextField label={arabic ? "اسمك" : "Your name"} value={draft.displayName} onChangeText={v => update("displayName", v)} maxLength={120} autoComplete="name" /> : null}
    {step === "name" ? <><AppButton label={arabic ? "تفاصيل شخصية وإعدادات اختيارية" : "Optional personal details & preferences"} variant="secondary" onPress={() => setDetails(!details)} />{details ? <GlassCard>
      <AppTextField label={arabic ? "تاريخ الميلاد · YYYY-MM-DD · اختياري" : "Date of birth · YYYY-MM-DD · optional"} value={draft.dateOfBirth} onChangeText={v => update("dateOfBirth", v)} />
      <Text style={ui.small}>{arabic ? "الجنس · اختياري" : "Sex · optional"}</Text>
      {(["female", "male", "unspecified"] as const).map((value, i) => <SelectableCard key={value} title={(arabic ? ["أنثى", "ذكر", "أفضل عدم الإجابة"] : ["Female", "Male", "Prefer not to say"])[i] ?? value} selected={draft.sex === value} onPress={() => update("sex", value)} />)}
      <Text style={ui.small}>{arabic ? "الوحدات المفضلة" : "Preferred units"}</Text>
      {(["metric", "imperial"] as const).map(value => <SelectableCard key={value} title={value === "metric" ? arabic ? "مترية" : "Metric" : arabic ? "إمبراطورية" : "Imperial"} selected={draft.preferredUnits === value} onPress={() => update("preferredUnits", value)} />)}
      <AppTextField label={arabic ? "المنطقة الزمنية" : "Timezone"} value={draft.timezone} onChangeText={v => update("timezone", v)} autoCapitalize="none" />
    </GlassCard> : null}</> : null}
    {step === "goal" ? goalOptions.map(option => <SelectableCard key={option.value} icon={option.icon} title={arabic ? option.ar : option.title} description={arabic ? option.descriptionAr : option.description} selected={draft.trainingGoal === option.value} onPress={() => {update("trainingGoal", option.value); setCoaching(cleanCoaching(option.value, coaching));}} arabic={arabic} />) : null}
    {step === "military" ? <View style={ui.stack}>{(["military_college", "other", "undecided"] as const).map((value, i) => <SelectableCard key={value} title={(arabic ? ["كلية عسكرية", "جهة أخرى", "لم أحدد بعد"] : ["Military college", "Another institution", "Still deciding"])[i] ?? value} selected={coaching.military_subtype === value} onPress={() => setCoaching({...coaching, military_subtype: value})} />)}<AppTextField label={coachingCopy("Target date \u00b7 YYYY-MM-DD \u00b7 optional", arabic)} value={coaching.target_date ?? ""} onChangeText={v => setCoaching({...coaching, target_date: v || null})} /><Text style={ui.small}>{coachingCopy("These are preparation categories, not a list of official eligibility standards.", arabic)}</Text></View> : null}
    {step === "focus" ? (["consistency", "endurance", ...(draft.trainingGoal === "fat_loss" ? ["body_composition" as const] : draft.trainingGoal !== "general_fitness" ? ["strength" as const] : [])] as const).map(value => <SelectableCard key={value} title={coachingCopy(value, arabic)} selected={coaching.focus === value} onPress={() => setCoaching({...coaching, focus: value})} />) : null}
    {step === "body" ? <><AssessmentEditor height={draft.heightCm} arabic={arabic} onSaved={() => { void overview.refetch().then(result => {const measurements = result.data?.latest?.snapshot.measurements; if (measurements?.height_cm) update("heightCm", String(measurements.height_cm)); setCoaching(current => ({...current, body_data_source: result.data?.latest?.snapshot.source ?? null}));}); }} /><Text style={ui.small}>{coachingCopy("You can continue without an assessment and add one later.", arabic)}</Text></> : null}
    {step === "experience" ? <>{(["beginner", "intermediate", "advanced"] as const).map((value, i) => <SelectableCard key={value} title={coachingCopy(value, arabic)} description={["New to a regular training routine.", "Some consistent training experience.", "Experienced with structured training."][i] ? coachingCopy(["New to a regular training routine.", "Some consistent training experience.", "Experienced with structured training."][i] ?? "", arabic) : undefined} selected={draft.experienceLevel === value} onPress={() => update("experienceLevel", value)} />)}<Text style={ui.heading}>{coachingCopy("How does activity feel today?", arabic)}</Text>{(["starting", "building", "established"] as const).map(value => <SelectableCard key={value} title={coachingCopy(value, arabic)} selected={coaching.fitness_level === value} onPress={() => setCoaching({...coaching, fitness_level: value})} />)}</> : null}
    {step === "schedule" ? <><Text style={ui.text}>{coachingCopy("Choose a week you can repeat.", arabic)}</Text><View style={ui.row}>{[2,3,4,5,6].map(value => <AppButton key={value} label={`${value} ${arabic ? "\u0623\u064a\u0627\u0645" : "days"}`} variant={draft.availableTrainingDays === value ? "primary" : "secondary"} onPress={() => update("availableTrainingDays", value)} />)}</View><Text style={ui.heading}>{coachingCopy("What can you train with?", arabic)}</Text>{["bodyweight", "dumbbell", "barbell", "machine", "bands"].map(value => <SelectableCard key={value} title={coachingCopy(value, arabic)} selected={draft.availableEquipment.includes(value)} onPress={() => update("availableEquipment", draft.availableEquipment.includes(value) ? draft.availableEquipment.filter(v => v !== value) : [...draft.availableEquipment, value])} />)}</> : null}
    {step === "performance" ? <PerformanceFields goal={draft.trainingGoal} value={coaching} onChange={setCoaching} arabic={arabic} /> : null}
    {step === "summary" ? <><GlassCard><Text style={ui.heading}>{draft.displayName}</Text><Text style={ui.text}>{goalLabel(draft.trainingGoal, arabic)}</Text><Text style={ui.text}>{draft.availableTrainingDays} {coachingCopy("days / week", arabic)} · {coachingCopy(draft.experienceLevel, arabic)}</Text><Text style={ui.small}>{coachingCopy("Changing your goal or schedule archives your previous plan. Your workout history stays available.", arabic)}</Text></GlassCard>{overview.data ? <ScoreCard score={overview.data.score} arabic={arabic} /> : null}</> : null}
    </StepReveal>

  </CoachingPage>;
}
