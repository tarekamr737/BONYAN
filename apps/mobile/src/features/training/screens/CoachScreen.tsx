import { phrase } from "../../../core/i18n/copy";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { AppButton, AppTextField, CinematicHero } from "../../../core/components";
import { getMyProfile } from "../../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
import { getCoachMessages, sendCoachMessage } from "../api/trainingApi";
import { readableCoachText } from "../coachText";

export function CoachScreen() {
  const client = useQueryClient();
  const busy = useRef(false);
  const [proposals, setProposals] = useState<string[]>([]);
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const history = useQuery({queryKey: ["coach", "messages"], queryFn: getCoachMessages});
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const [message, setMessage] = useState("");
  const send = useMutation({mutationFn: (text: string) => sendCoachMessage(text), onSuccess: (response) => {
    setMessage("");
    setProposals(response.tool_results.flatMap(tool => {
      const result = tool.result as {requires_approval?: boolean; plan?: {id?: string}} | undefined;
      return result?.requires_approval && typeof result.plan?.id === "string" ? [result.plan.id] : [];
    }));
    void client.invalidateQueries({queryKey: ["coach", "messages"]});
    void client.invalidateQueries({queryKey: ["training"]});
  }});
  return <CoachingPage arabic={arabic} footer={<View style={{gap: 8}}><AppTextField label={phrase("copy_8c13351960ef", arabic)} multiline value={message} editable={!send.isPending} onChangeText={setMessage} maxLength={1000} placeholder={phrase("copy_1ccb29fb7c6d", arabic)} /><AppButton label={phrase("copy_d59535eb5fda", arabic)} loading={send.isPending} disabled={!message.trim()} onPress={() => { if (busy.current) return; busy.current = true; void send.mutateAsync(message.trim()).catch(() => {}).finally(() => {busy.current = false;}); }} /></View>}>
    <CinematicHero arabic={arabic} source={require("../../../../assets/heroes/coach.jpg")} title={phrase("copy_22b1be1238ab", arabic)} subtitle={phrase("copy_6acba9dd4047", arabic)} />
    {history.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{phrase("copy_73eb4ca28b61", arabic)}</Text> : null}
    {history.isError ? <GlassCard><Text accessibilityRole="alert" style={ui.error}>{phrase("copy_b520a5937de7", arabic)}</Text><AppButton label={phrase("copy_bb30cda7c34e", arabic)} variant="secondary" onPress={() => void history.refetch()} /></GlassCard> : null}
    {history.data?.length === 0 ? <GlassCard><Text style={ui.heading}>{phrase("copy_23fbb36c98b1", arabic)}</Text>{(arabic ? ["اشرح لي خطة التمرين", "ساعدني ألاقي بديل لتمرين"] : ["Explain my training plan", "Help me find an exercise alternative"]).map(prompt => <AppButton key={prompt} label={prompt} variant="secondary" onPress={() => setMessage(prompt)} />)}</GlassCard> : null}
    {history.data?.map(entry => <GlassCard key={entry.id}><Text style={ui.small}>{entry.role === "coach" ? phrase("copy_62c0c6162da7", arabic) : phrase("copy_3548f99b7559", arabic)}</Text><Text selectable style={ui.text}>{entry.role === "coach" ? readableCoachText(entry.content) : entry.content}</Text></GlassCard>)}
    {proposals.map(id => <GlassCard key={id}><Text style={ui.text}>{phrase("copy_beaef73c4923", arabic)}</Text><AppButton label={phrase("copy_7d0bd5ba6d61", arabic)} onPress={() => router.push({pathname: "/training/review", params: {planId: id}})} /><AppButton variant="secondary" label={phrase("copy_86d2ffbd6fc6", arabic)} onPress={() => setProposals(current => current.filter(value => value !== id))} /></GlassCard>)}
    {send.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{phrase("copy_63fef97c2a01", arabic)}</Text> : null}
    {send.isError ? <Text accessibilityRole="alert" style={ui.error}>{phrase("copy_5ceb8a7442b8", arabic)}</Text> : null}
  </CoachingPage>;
}
