import { phrase } from "../../../core/i18n/copy";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { AppButton, AppTextField, BrandMark } from "../../../core/components";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
import { getCoachMessages, getPendingSessionSubstitutions, getWorkoutSessions, sendCoachMessage } from "../api/trainingApi";
import { SessionSubstitutionPanel } from "../components/SessionSubstitutionPanel";
import { coachMatchesLocale, readableCoachText } from "../coachText";

export function CoachScreen() {
  const client = useQueryClient();
  const {t, rtl: arabic} = useLocale();
  const busy = useRef(false);
  const [proposals, setProposals] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sessions = useQuery({queryKey: ["training", "sessions", "coach"], queryFn: () => getWorkoutSessions(20)});
  const active = sessions.data?.find(item => item.status === "active");
  const pending = useQuery({queryKey: ["training", "substitutions", active?.id], queryFn: () => getPendingSessionSubstitutions(active!.id), enabled: Boolean(active)});
  const proposal = pending.data?.find(item => item.prescription_index === selectedIndex);
  const history = useQuery({queryKey: ["coach", "messages"], queryFn: getCoachMessages});
  const [message, setMessage] = useState("");
  const send = useMutation({mutationFn: (text: string) => sendCoachMessage(text), onSuccess: (response) => {
    setMessage("");
    setProposals(response.tool_results.flatMap(tool => {
      const result = tool.result as {requires_approval?: boolean; plan?: {id?: string}} | undefined;
      return result?.requires_approval && typeof result.plan?.id === "string" ? [result.plan.id] : [];
    }));
    void client.invalidateQueries({queryKey: ["coach", "messages"]});
    void client.invalidateQueries({queryKey: ["training"]});
    const toolProposal = response.tool_results.find(tool => tool.name === "preview_session_substitution")?.result as {proposal?: {prescription_index?: number}} | undefined;
    if (typeof toolProposal?.proposal?.prescription_index === "number") setSelectedIndex(toolProposal.proposal.prescription_index);
  }});
  return <CoachingPage arabic={arabic} footer={<View style={{gap: 8}}><AppTextField label={phrase("copy_8c13351960ef", arabic)} multiline value={message} editable={!send.isPending} onChangeText={setMessage} maxLength={1000} placeholder={phrase("copy_1ccb29fb7c6d", arabic)} /><AppButton label={phrase("copy_d59535eb5fda", arabic)} loading={send.isPending} disabled={!message.trim()} onPress={() => { if (busy.current) return; busy.current = true; void send.mutateAsync(message.trim()).catch(() => {}).finally(() => {busy.current = false;}); }} /></View>}>
    <BrandMark/><Text accessibilityRole="header" style={ui.title}>{t("coach")}</Text><Text style={ui.text}>{t("coachTodayHelp")}</Text>
    {history.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{phrase("copy_73eb4ca28b61", arabic)}</Text> : null}
    {history.isError ? <GlassCard><Text accessibilityRole="alert" style={ui.error}>{phrase("copy_b520a5937de7", arabic)}</Text><AppButton label={phrase("copy_bb30cda7c34e", arabic)} variant="secondary" onPress={() => void history.refetch()} /></GlassCard> : null}
    {history.data?.length === 0 ? <GlassCard><Text style={ui.heading}>{phrase("copy_23fbb36c98b1", arabic)}</Text>{[t("coachExplainPrompt"), t("coachAlternativePrompt")].map(prompt => <AppButton key={prompt} label={prompt} variant="secondary" onPress={() => setMessage(prompt)} />)}</GlassCard> : null}
    {history.data?.map(entry => <View key={entry.id} style={{width: entry.role === "user" ? "88%" : "100%", alignSelf: entry.role === "user" ? arabic ? "flex-start" : "flex-end" : "stretch"}}><GlassCard><Text style={ui.small}>{entry.role === "coach" ? t("coach") : t("you")}</Text><Text selectable style={ui.text}>{entry.role === "coach" ? coachMatchesLocale(entry.content, arabic) ? readableCoachText(entry.content) : t("archivedCoachLocale") : entry.content}</Text></GlassCard></View>)}
    {active?.prescription_snapshot ? <><Text style={ui.heading}>{t("chooseExercise")}</Text>{active.prescription_snapshot.prescriptions.map((exercise, index) => <Pressable key={`${exercise.exercise_id}-${index}`} accessibilityRole="radio" accessibilityState={{selected: selectedIndex === index}} onPress={() => setSelectedIndex(index)} style={[ui.glass, {minHeight: 50}]}><Text style={ui.text}>{index === selectedIndex ? "✓ " : ""}{exercise.name}</Text></Pressable>)}<SessionSubstitutionPanel key={`${active.id}-${selectedIndex}`} session={active} index={selectedIndex} initialProposal={proposal} onCommitted={() => void sessions.refetch()}/></> : null}
    {proposals.map(id => <GlassCard key={id}><Text style={ui.text}>{phrase("copy_beaef73c4923", arabic)}</Text><AppButton label={phrase("copy_7d0bd5ba6d61", arabic)} onPress={() => router.push({pathname: "/training/review", params: {planId: id}})} /><AppButton variant="secondary" label={phrase("copy_86d2ffbd6fc6", arabic)} onPress={() => setProposals(current => current.filter(value => value !== id))} /></GlassCard>)}
    {send.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{phrase("copy_63fef97c2a01", arabic)}</Text> : null}
    {send.isError ? <Text accessibilityRole="alert" style={ui.error}>{phrase("copy_5ceb8a7442b8", arabic)}</Text> : null}
  </CoachingPage>;
}
