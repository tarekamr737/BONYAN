import { phraseTemplate , phrase } from "../../../core/i18n/copy";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import Feather from "@expo/vector-icons/Feather";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { coachingCopy } from "../coachingCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { BackHandler, Platform, View } from "react-native";

import { AppButton, AppTextField } from "../../../core/components";
import { readCoachingDraft, storeCoachingDraft } from "../../../core/auth/draftStorage";
import { colors } from "../../../core/theme/tokens";
import { getAssessment, updateMyProfile } from "../api/profileApi";
import { cleanCoaching, goalLabel, goalOptions, journeySteps, type JourneyStep } from "../journey";
import { shouldStepBack } from "../journeyNavigation";
import { profileDraftToUpdate, profileToDraft, validateProfileDraft, type ProfileDraft } from "../profileDraft";
import type { CoachingPreferences, UserProfile } from "../types";
import { AssessmentEditor } from "./AssessmentEditor";
import { CoachingPage, GlassCard, ScoreCard, SelectableCard, StepReveal, ProgressMeter, ui } from "./CoachingUI";
import { PerformanceFields, performanceError } from "./PerformanceFields";

type SavedDraft = {draft: ProfileDraft; coaching: CoachingPreferences; step: JourneyStep};

const stepIcons: Record<JourneyStep, ComponentProps<typeof Feather>["name"]> = {
  welcome: "compass", name: "user", goal: "target", "gym-goal": "trending-up",
  military: "shield", "test-date": "calendar", focus: "crosshair", body: "activity",
  experience: "bar-chart-2", schedule: "clock", equipment: "tool", performance: "award",
  running: "wind", pushups: "arrow-up-circle", situps: "repeat", pullups: "chevrons-up", limitations: "alert-circle", summary: "check-circle",
};

const equipmentIcons: Record<string, ComponentProps<typeof Feather>["name"]> = {
  bodyweight: "user", dumbbell: "box", barbell: "minus", machine: "grid", bands: "activity",
};

function normalizeDateInput(value: string): string | null {
  const match = value.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  if (!year || !month || !day) return null;
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized
    ? normalized
    : null;
}

export function CoachingJourney({profile, editing = false, onDone}: {profile: UserProfile; editing?: boolean; onDone?: () => void}) {
  const { setLocale } = useLocale();
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
  }, onError: () => setError(phrase("copy_30ba7e55434e", arabic))});
  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) { setDraft(current => ({...current, [key]: value})); setError(null); }
  const required = step === "name" ? Boolean(draft.displayName.trim()) : step === "military" ? Boolean(coaching.military_subtype) : step === "equipment" ? draft.availableEquipment.length > 0 : true;
  async function next() {
    if (busy.current || !required) return;
    busy.current = true; setError(null);
    try {
      if (step === "name") { const invalid = validateProfileDraft(draft); if (invalid) {setError(invalid); return;} }
      if (step === "test-date" && coaching.target_date) {
        const normalizedDate = normalizeDateInput(coaching.target_date);
        if (!normalizedDate) {setError(phrase("copy_8838e533eb64", arabic)); return;}
        if (normalizedDate !== coaching.target_date) setCoaching(current => ({...current, target_date: normalizedDate}));
      }
      if (["performance", "running", "pushups", "situps", "pullups"].includes(step) && performanceError(cleanCoaching(draft.trainingGoal, coaching))) return;
      if (step === "summary") { const invalid = validateProfileDraft(draft); if (invalid) {setError(invalid); return;} await save.mutateAsync(true); }
      else { setStep(steps[position + 1] ?? "summary"); }
    } catch { /* Mutation renders the safe recoverable error. */ } finally {busy.current = false;}
  }
  if (!restored) return <CoachingPage><Text style={ui.text}>{coachingCopy("Loading your saved setup\u2026", arabic)}</Text></CoachingPage>;
  if (complete) return <CoachingPage arabic={arabic}><Text style={ui.title}>{phrase("copy_6895335d313b", arabic)}</Text><GlassCard><Text style={ui.heading}>{draft.displayName}</Text><Text style={ui.text}>{goalLabel(draft.trainingGoal, arabic)}</Text><Text style={ui.text}>{draft.availableTrainingDays} {coachingCopy("days / week", arabic)} · {coachingCopy(draft.experienceLevel, arabic)}</Text><Text style={ui.small}>{overview.data?.latest ? (phraseTemplate("copy_794d54b22780", arabic, (arabic) ? [overview.data.latest.snapshot.source === "inbody" ? "تقرير InBody" : "قياسات يدوية"] : [overview.data.latest.snapshot.source])) : (phrase("copy_e1961065f830", arabic))}</Text></GlassCard>{overview.data ? <ScoreCard score={overview.data.score} arabic={arabic} /> : null}<AppButton label={phrase("copy_a9f8de47c693", arabic)} onPress={() => {client.setQueryData(["profile", "me"], save.data); onDone?.(); router.replace("/");}} /></CoachingPage>;
  const titles: Record<JourneyStep, string> = {"gym-goal": phrase("copy_f0a240648074", arabic), "test-date": phrase("copy_d7d754b1a395", arabic), running: phrase("copy_91103b0d13f1", arabic), pushups: phrase("copy_0cc42bc6d767", arabic), situps: phrase("copy_b7e4d91fc0a6", arabic), pullups: phrase("copy_ce04d9010714", arabic), limitations: phrase("copy_70192f60e288", arabic), equipment: phrase("copy_ec2973db0c75", arabic), welcome: phrase("copy_f2b514a0663a", arabic), name: phrase("copy_b96c41abc213", arabic), goal: phrase("copy_af0a221dc58d", arabic), military: phrase("copy_103b110ab4e1", arabic), focus: phrase("copy_1690cfe68864", arabic), body: phrase("copy_a9c9f4734d31", arabic), experience: phrase("copy_415e46171cbd", arabic), schedule: phrase("copy_61bcbfd4e959", arabic), performance: phrase("copy_a8cc2f4b8fdd", arabic), summary: phrase("copy_028dd16fd2b8", arabic)};
  return <CoachingPage arabic={arabic} step={step} footer={<>{error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
    <AppButton label={step === "summary" ? phrase("copy_2e005f2441a3", arabic) : step === "body" && !overview.data?.latest ? phrase("copy_7e44c4aafc62", arabic) : phrase("copy_bdd4a0458cf0", arabic)} disabled={!required || (["performance", "running", "pushups", "situps", "pullups"].includes(step) && performanceError(cleanCoaching(draft.trainingGoal, coaching)))} loading={save.isPending} onPress={() => void next()} />
    <View style={ui.row}>{position > 0 ? <AppButton label={phrase("copy_436170a81a03", arabic)} variant="secondary" disabled={save.isPending} onPress={() => {setError(null);setStep(steps[position - 1] ?? "welcome");}} /> : null}
    {editing ? <AppButton label={coachingCopy("Close editor", arabic)} variant="secondary" onPress={onDone} /> : null}</View></>}>
    <View style={ui.row}><Text style={[ui.small, {flex: 1}]}>{phrase("copy_2a8c7074a008", arabic)} {position + 1} / {steps.length}</Text><AppButton label={arabic ? "English" : "العربية"} variant="secondary" onPress={() => { const next = arabic ? "en" : "ar-EG"; update("preferredLanguage", next); void setLocale(next); }} /></View>
    <ProgressMeter value={(position + 1) / steps.length * 100} label={phrase("copy_6adfbb690476", arabic)} />
    <StepReveal step={step}><View style={[ui.row, arabic && {flexDirection: "row-reverse"}]}><View style={{alignItems: "center", backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder, borderRadius: 16, borderWidth: 1, height: 52, justifyContent: "center", width: 52}}><Feather color={colors.bronze} name={stepIcons[step]} size={24} /></View><Text accessibilityRole="header" style={[ui.title, {flex: 1}, arabic && ui.rtl]}>{titles[step]}</Text></View>
    {step === "welcome" ? <GlassCard><Text style={ui.text}>{phrase("copy_9427f11835c1", arabic)}</Text><Text style={ui.small}>{coachingCopy("Your reports and measurements stay private. You choose what to share.", arabic)}</Text></GlassCard> : null}
    {step === "name" ? <AppTextField label={phrase("copy_3d4e4ddac786", arabic)} value={draft.displayName} onChangeText={v => update("displayName", v)} maxLength={120} autoComplete="name" /> : null}
    {step === "name" ? <><AppButton label={phrase("copy_91a73c7dd0f1", arabic)} variant="secondary" onPress={() => setDetails(!details)} />{details ? <GlassCard>
      <AppTextField label={phrase("copy_f05a977c6084", arabic)} value={draft.dateOfBirth} onChangeText={v => update("dateOfBirth", v)} />
      <Text style={ui.small}>{phrase("copy_2994e16346ab", arabic)}</Text>
      {(["female", "male", "unspecified"] as const).map((value, i) => <SelectableCard key={value} title={(arabic ? ["أنثى", "ذكر", "أفضل عدم الإجابة"] : ["Female", "Male", "Prefer not to say"])[i] ?? value} selected={draft.sex === value} onPress={() => update("sex", value)} />)}
      <Text style={ui.small}>{phrase("copy_56903d53aa62", arabic)}</Text>
      {(["metric", "imperial"] as const).map(value => <SelectableCard key={value} title={value === "metric" ? phrase("copy_6c3a57c44476", arabic) : phrase("copy_fa9b9ba2e8ae", arabic)} selected={draft.preferredUnits === value} onPress={() => update("preferredUnits", value)} />)}
      <AppTextField label={phrase("copy_41cbb59380fb", arabic)} value={draft.timezone} onChangeText={v => update("timezone", v)} autoCapitalize="none" />
    </GlassCard> : null}</> : null}
    {step === "goal" ? <><SelectableCard arabic={arabic} icon="shield" title={phrase("copy_29beb0662518", arabic)} description={phrase("copy_f2b802cca4bc", arabic)} selected={draft.trainingGoal === "military_preparation"} onPress={() => update("trainingGoal", "military_preparation")} /><SelectableCard arabic={arabic} icon="activity" title={phrase("copy_f330ca40bdd7", arabic)} description={phrase("copy_da7af65acf0e", arabic)} selected={draft.trainingGoal !== "military_preparation"} onPress={() => update("trainingGoal", draft.trainingGoal === "military_preparation" ? "general_fitness" : draft.trainingGoal)} /></> : null}
    {step === "gym-goal" ? goalOptions.filter(option => option.value !== "military_preparation").map(option => <SelectableCard key={option.value} arabic={arabic} title={arabic ? option.ar : option.title} description={arabic ? option.descriptionAr : option.description} selected={draft.trainingGoal === option.value} onPress={() => update("trainingGoal", option.value)} />) : null}
    {step === "test-date" ? <><Text style={ui.text}>{phrase("copy_d9db16c883b1", arabic)}</Text><AppTextField label={phrase("copy_53c1cc615a0c", arabic)} placeholder="2026-10-05" value={coaching.target_date ?? ""} onChangeText={value => {setCoaching({...coaching, target_date: value || null}); setError(null);}} /></> : null}
    {["running", "pushups", "situps", "pullups"].includes(step) ? <PerformanceFields key={step} goal={draft.trainingGoal} value={coaching} onChange={setCoaching} arabic={arabic} only={step === "running" ? ["running_minutes", "running_target_minutes"] : step === "pushups" ? ["pushups", "pushups_target"] : step === "situps" ? ["situps", "situps_target"] : ["pullups", "pullups_target"]} /> : null}
    {step === "limitations" ? <><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_28e7311d3784", arabic)}</Text><AppTextField label={phrase("copy_14b8e69daf8e", arabic)} value={coaching.limitations ?? ""} maxLength={500} onChangeText={value => setCoaching({...coaching, limitations: value.trimStart() || null})} /></> : null}
    {step === "military" ? <View style={ui.stack}>{(["military_college", "other", "undecided"] as const).map((value, i) => <SelectableCard key={value} title={(arabic ? ["كلية عسكرية", "جهة أخرى", "لم أحدد بعد"] : ["Military college", "Another institution", "Still deciding"])[i] ?? value} selected={coaching.military_subtype === value} onPress={() => setCoaching({...coaching, military_subtype: value})} />)}<Text style={ui.small}>{coachingCopy("These are preparation categories, not a list of official eligibility standards.", arabic)}</Text></View> : null}
    {step === "focus" ? (["consistency", "endurance", ...(draft.trainingGoal === "fat_loss" ? ["body_composition" as const] : draft.trainingGoal !== "general_fitness" ? ["strength" as const] : [])] as const).map(value => <SelectableCard key={value} title={coachingCopy(value, arabic)} selected={coaching.focus === value} onPress={() => setCoaching({...coaching, focus: value})} />) : null}
    {step === "body" ? <><AssessmentEditor height={draft.heightCm} arabic={arabic} onSaved={() => { void overview.refetch().then(result => {const measurements = result.data?.latest?.snapshot.measurements; if (measurements?.height_cm) update("heightCm", String(measurements.height_cm)); setCoaching(current => ({...current, body_data_source: result.data?.latest?.snapshot.source ?? null}));}); }} /><Text style={ui.small}>{coachingCopy("You can continue without an assessment and add one later.", arabic)}</Text></> : null}
    {step === "experience" ? <>{(["beginner", "intermediate", "advanced"] as const).map((value, i) => <SelectableCard key={value} title={coachingCopy(value, arabic)} description={["New to a regular training routine.", "Some consistent training experience.", "Experienced with structured training."][i] ? coachingCopy(["New to a regular training routine.", "Some consistent training experience.", "Experienced with structured training."][i] ?? "", arabic) : undefined} selected={draft.experienceLevel === value} onPress={() => update("experienceLevel", value)} />)}<Text style={ui.heading}>{coachingCopy("How does activity feel today?", arabic)}</Text>{(["starting", "building", "established"] as const).map(value => <SelectableCard key={value} title={coachingCopy(value, arabic)} selected={coaching.fitness_level === value} onPress={() => setCoaching({...coaching, fitness_level: value})} />)}</> : null}
    {step === "schedule" ? <><Text style={ui.text}>{coachingCopy("Choose a week you can repeat.", arabic)}</Text><View style={ui.row}>{[2,3,4,5,6].map(value => <AppButton key={value} label={`${value} ${phrase("copy_bc903d217094", arabic)}`} variant={draft.availableTrainingDays === value ? "primary" : "secondary"} onPress={() => update("availableTrainingDays", value)} />)}</View></> : null}
    {step === "equipment" ? <><Text style={ui.heading}>{coachingCopy("What can you train with?", arabic)}</Text>{["bodyweight", "dumbbell", "barbell", "machine", "bands"].map(value => <SelectableCard arabic={arabic} icon={equipmentIcons[value]} key={value} title={coachingCopy(value, arabic)} selected={draft.availableEquipment.includes(value)} onPress={() => update("availableEquipment", draft.availableEquipment.includes(value) ? draft.availableEquipment.filter(v => v !== value) : [...draft.availableEquipment, value])} />)}</> : null}
    {step === "performance" ? <PerformanceFields only={draft.trainingGoal === "military_preparation" ? ["active_days_per_week"] : undefined} goal={draft.trainingGoal} value={coaching} onChange={setCoaching} arabic={arabic} /> : null}
    {step === "summary" ? <><GlassCard><Text style={ui.heading}>{draft.displayName}</Text><Text style={ui.text}>{goalLabel(draft.trainingGoal, arabic)}</Text><Text style={ui.text}>{draft.availableTrainingDays} {coachingCopy("days / week", arabic)} · {coachingCopy(draft.experienceLevel, arabic)}</Text><Text style={ui.small}>{coachingCopy("Changing your goal or schedule archives your previous plan. Your workout history stays available.", arabic)}</Text></GlassCard><GlassCard><Text style={ui.heading}>{phrase("copy_1483584106e2", arabic)}</Text><Text style={ui.text}>{draft.availableEquipment.map(value => coachingCopy(value, arabic)).join(" · ")}</Text>{draft.trainingGoal === "military_preparation" ? <><Text style={ui.text}>{coaching.military_subtype ?? "—"} · {coaching.target_date ?? "—"}</Text><Text style={ui.text}>{phrase("copy_906e3b1673ba", arabic)}: {coaching.running_minutes ?? "—"} / {coaching.pushups ?? "—"} / {coaching.situps ?? "—"} / {coaching.pullups ?? "—"}</Text>{coaching.limitations ? <Text style={ui.small}>{phrase("copy_e165555e46ca", arabic)}{coaching.limitations}</Text> : null}</> : null}<Text style={ui.text}>{overview.data?.latest?.snapshot.measurements?.weight_kg ?? "—"} kg · {draft.heightCm || "—"} cm</Text><AppButton variant="secondary" label={phrase("copy_7fed4b553beb", arabic)} onPress={() => setStep("name")} /></GlassCard>{overview.data ? <ScoreCard score={overview.data.score} arabic={arabic} /> : null}</> : null}
    </StepReveal>

  </CoachingPage>;
}
