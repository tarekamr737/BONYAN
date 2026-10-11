import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { approveSessionSubstitution, previewSessionSubstitution, rejectSessionSubstitution, undoSessionSubstitution } from "../api/trainingApi";
import type { SessionSubstitution, SubstitutionScope, SubstitutionReason, SubstitutionResult, WorkoutSession } from "../types";
import { ExerciseMedia } from "./ExerciseMedia";

export function SessionSubstitutionPanel({session, index, onCommitted}: {session: WorkoutSession; index: number; onCommitted: (session: WorkoutSession) => void}) {
  const {t} = useLocale();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<SubstitutionReason>("busy_today");
  const [scope, setScope] = useState<SubstitutionScope>("session");
  const [proposal, setProposal] = useState<SessionSubstitution | null>(null);
  const [approved, setApproved] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const commit = (result: SubstitutionResult) => {
    onCommitted(result.session);
    queryClient.setQueryData(["training", "session", session.id], result.session);
    for (const key of ["training", "home", "coach", "activity", "profile"]) void queryClient.invalidateQueries({queryKey: [key]});
  };
  const preview = useMutation({mutationFn: () => previewSessionSubstitution(session.id, {prescription_index: index, scope, reason}), onSuccess: (value) => {setProposal(value); setAcknowledged(false); setApproved(null);}});
  const approve = useMutation({mutationFn: () => approveSessionSubstitution(proposal!, `approve-${proposal!.id}`, acknowledged), onSuccess: (result) => {commit(result); setApproved(proposal!.scope === "session" ? proposal!.id : null); setProposal(null);}});
  const reject = useMutation({mutationFn: () => rejectSessionSubstitution(proposal!.id), onSuccess: () => setProposal(null)});
  const undo = useMutation({mutationFn: () => undoSessionSubstitution(approved!), onSuccess: (result) => {commit(result); setApproved(null);}});
  const busy = preview.isPending || approve.isPending || reject.isPending || undo.isPending;
  const logged = session.logged_sets.some(item => item.prescription_index === index);
  const error = preview.error ?? approve.error ?? reject.error ?? undo.error;
  return <SurfaceCard>
    {proposal ? <>
      <Text style={styles.title}>{proposal.original.name} → {proposal.candidate.name}</Text>
      <ExerciseMedia exerciseId={proposal.candidate.exercise_id} name={proposal.candidate.name}/>
      <Text style={styles.copy}>{t(proposal.scope === "session" ? "sessionScope" : proposal.scope === "plan" ? "planScope" : "equipmentScope")}</Text>
      {logged ? <Pressable accessibilityRole="checkbox" accessibilityState={{checked: acknowledged}} style={styles.button} onPress={() => setAcknowledged(!acknowledged)} disabled={busy}><Text style={styles.copy}>{acknowledged ? "✓ " : "☐ "}{t("remainingSets")}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={busy || (logged && !acknowledged)} style={styles.button} onPress={() => approve.mutate()}><Text style={styles.label}>{t("approve")}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => reject.mutate()}><Text style={styles.label}>{t("reject")}</Text></Pressable>
    </> : <>
      <View style={styles.options}>{(["busy_today", "not_available"] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected: reason === value}} disabled={busy} style={[styles.button, reason === value && styles.selected]} onPress={() => {setReason(value); if(value === "busy_today") setScope("session");}}><Text style={styles.label}>{t(value === "busy_today" ? "busyToday" : "missingEquipment")}</Text></Pressable>)}</View>
      <View style={styles.options}>{(["session", "plan", "equipment"] as const).filter(value => reason !== "busy_today" || value === "session").map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected: scope === value}} disabled={busy} style={[styles.button, scope === value && styles.selected]} onPress={() => setScope(value)}><Text style={styles.label}>{t(value === "session" ? "sessionScope" : value === "plan" ? "planScope" : "equipmentScope")}</Text></Pressable>)}</View>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => preview.mutate()}><Text style={styles.label}>{t("preview")}</Text></Pressable>
      {approved ? <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => undo.mutate()}><Text style={styles.label}>{t("undo")}</Text></Pressable> : null}
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error.message}</Text> : null}
  </SurfaceCard>;
}
const styles = StyleSheet.create({
  options: {gap: spacing.sm, marginBottom: spacing.sm},
  title: {fontFamily: fonts.displaySemiBold, color: colors.text, fontSize: 20},
  copy: {fontFamily: fonts.body, color: colors.mutedLight, fontSize: 14, lineHeight: 22},
  label: {fontFamily: fonts.bodySemiBold, color: colors.bronze, fontSize: 14},
  error: {fontFamily: fonts.body, color: colors.error, fontSize: 14},
  button: {minHeight: 50, padding: spacing.sm, justifyContent: "center", borderWidth: 1, borderColor: colors.bronzeBorder, borderRadius: radii.control, marginTop: spacing.xs},
  selected: {backgroundColor: colors.surfaceRaised},
});
