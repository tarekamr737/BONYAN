import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { coachingCopy } from "../coachingCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AppButton, AppTextField } from "../../../core/components";
import { readCoachingDraft, storeCoachingDraft } from "../../../core/auth/draftStorage";
import { getInBodyHistory } from "../../inbody/api/inbodyApi";
import { saveAssessment } from "../api/profileApi";
import { GlassCard, SelectableCard, ui } from "./CoachingUI";

export function AssessmentEditor({onSaved, height = "", arabic = false}: {onSaved?: () => void; height?: string; arabic?: boolean}) {
  const client = useQueryClient();
  const [source, setSource] = useState<"manual" | "inbody">("manual");
  const [values, setValues] = useState({height, weight: "", fat: ""});
  const [scan, setScan] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let active = true;
    void readCoachingDraft("assessment").then(raw => {
      if (!active || !raw) return;
      const saved = JSON.parse(raw);
      if ((saved.source === "manual" || saved.source === "inbody") && saved.values && typeof saved.values.height === "string" && typeof saved.values.weight === "string" && typeof saved.values.fat === "string") {
        setSource(saved.source); setValues(saved.values); setScan(saved.scan ?? null); setRequestId(saved.requestId ?? null);
      }
    }).catch(() => {}).finally(() => {if (active) setRestored(true);});
    return () => {active = false;};
  }, []);
  const history = useQuery({queryKey: ["inbody", "history"], queryFn: getInBodyHistory, enabled: source === "inbody"});
  const mutation = useMutation({mutationFn: async () => {
    // Deduplication ID only; never used for authentication.
    const id = requestId ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const n = Math.floor(Math.random() * 16); return (c === "x" ? n : (n & 3) | 8).toString(16); }); setRequestId(id);
    return saveAssessment(source === "manual" ? {request_id: id, source, measurements: {height_cm: Number(values.height), weight_kg: Number(values.weight), body_fat_percentage: values.fat ? Number(values.fat) : null}} : {request_id: id, source, inbody_scan_id: scan ?? ""});
  }, onSuccess: async () => { await storeCoachingDraft(null, "assessment").catch(() => {}); await Promise.all([client.invalidateQueries({queryKey: ["assessment"]}), client.invalidateQueries({queryKey: ["profile"]}), client.invalidateQueries({queryKey: ["profile-history"]})]); onSaved?.(); }});
  useEffect(() => {
    if (restored && !mutation.isSuccess) void storeCoachingDraft(JSON.stringify({source, values, scan, requestId}), "assessment").catch(() => {});
  }, [restored, source, values, scan, requestId, mutation.isSuccess]);
  const valid = source === "inbody" ? scan !== null : [values.height, values.weight].every(v => v.trim() && Number.isFinite(Number(v))) && Number(values.height) >= 80 && Number(values.height) <= 250 && Number(values.weight) >= 30 && Number(values.weight) <= 350 && (!values.fat || Number(values.fat) >= 2 && Number(values.fat) <= 70);
  function field(key: keyof typeof values, label: string) { return <AppTextField label={label} keyboardType="decimal-pad" value={values[key]} onChangeText={v => {setValues({...values, [key]: v.replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 1632)).replace("\u066b", ".")}); setRequestId(null); mutation.reset();}} editable={!mutation.isPending} />; }
  if (!restored) return <Text style={ui.text}>{arabic ? "جاري استعادة القياسات…" : "Loading your measurements…"}</Text>;
  return <View style={ui.stack}>
    <Text style={ui.heading}>{arabic ? "كيف تضيف قياسات جسمك؟" : "How would you like to add your body data?"}</Text>
    <View style={ui.stack}>{(["manual", "inbody"] as const).map(value => <SelectableCard key={value} selected={source === value} disabled={mutation.isPending} onPress={() => {setSource(value); setRequestId(null); mutation.reset();}} title={value === "manual" ? arabic ? "إدخال يدوي" : "Enter measurements" : "InBody"} description={value === "manual" ? "Add height and weight. Body fat is optional." : "Use a real report you have reviewed and confirmed."} />)}</View>
    {source === "manual" ? <GlassCard>{field("height", arabic ? "الطول (سم)" : "Height · cm")}{field("weight", arabic ? "الوزن الحالي (كجم)" : "Current weight · kg")}{field("fat", arabic ? "نسبة الدهون — اختياري" : "Body fat · % · optional")}<Text style={ui.small}>{coachingCopy("Height 80\u2013250 cm \u00b7 Weight 30\u2013350 kg \u00b7 Body fat 2\u201370% when known.", arabic)}</Text></GlassCard> : <View style={ui.stack}>
      {history.isPending ? <Text style={ui.text}>{coachingCopy("Loading your confirmed reports\u2026", arabic)}</Text> : null}
      {history.isError ? <AppButton label={coachingCopy("Retry loading reports", arabic)} onPress={() => void history.refetch()} variant="secondary" /> : null}
      {history.data?.scans.map((item, index) => <SelectableCard key={item.id} disabled={mutation.isPending} selected={scan === item.id} title={`${index === 0 ? "Latest · " : ""}${new Date(item.confirmed_at ?? item.created_at).toLocaleDateString()}`} description={item.result?.measurements.filter(m => m.value !== null && ["weight", "body_fat_percentage"].includes(m.key)).map(m => `${m.key.replaceAll("_", " ")}: ${m.value} ${m.unit ?? ""}`).join(" · ")} onPress={() => {setScan(item.id); setRequestId(null); mutation.reset();}} />)}
      {history.data?.scans.length === 0 ? <Text style={ui.text}>{coachingCopy("No confirmed report yet. Upload one, review its values, then return here. You can also use manual entry.", arabic)}</Text> : null}
      <AppButton label={arabic ? "رفع تقرير InBody" : "Upload an InBody report"} onPress={() => router.push("/inbody")} variant="secondary" />
    </View>}
    {mutation.isError ? <Text accessibilityRole="alert" style={ui.error}>{coachingCopy("Couldn\u2019t save this assessment. Your entries are still here. Check the values and try again.", arabic)}</Text> : null}
    {mutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={ui.success}>{coachingCopy("Assessment saved to your profile and history.", arabic)}</Text> : null}
    <AppButton label={arabic ? "حفظ التقييم" : "Save assessment"} disabled={!valid} loading={mutation.isPending} onPress={() => mutation.mutate()} />
  </View>;
}
