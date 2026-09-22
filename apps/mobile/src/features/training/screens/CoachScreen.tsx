import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { AppButton, AppTextField } from "../../../core/components";
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
  return <CoachingPage arabic={arabic} footer={<View style={{gap: 8}}><AppTextField label={arabic ? "رسالتك لبنيان" : "Your message to Bonyan"} multiline value={message} editable={!send.isPending} onChangeText={setMessage} maxLength={1000} placeholder={arabic ? "اسأل عن تدريبك…" : "Ask about your training…"} /><AppButton label={arabic ? "إرسال" : "Send"} loading={send.isPending} disabled={!message.trim()} onPress={() => { if (busy.current) return; busy.current = true; void send.mutateAsync(message.trim()).catch(() => {}).finally(() => {busy.current = false;}); }} /></View>}>
    <Text style={ui.title}>{arabic ? "الكوتش بنيان" : "Bonyan Coach"}</Text>
    <Text style={ui.text}>{arabic ? "خلينا ناخد تدريبك خطوة بخطوة. اسأل عن خطتك أو بديل لتمرين." : "Let's take training one step at a time. Ask about your plan or an exercise alternative."}</Text>
    {history.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{arabic ? "جارٍ تحميل المحادثة…" : "Loading conversation…"}</Text> : null}
    {history.isError ? <GlassCard><Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذر تحميل محادثتك المحفوظة." : "Couldn't load your saved conversation."}</Text><AppButton label={arabic ? "إعادة المحاولة" : "Retry"} variant="secondary" onPress={() => void history.refetch()} /></GlassCard> : null}
    {history.data?.length === 0 ? <GlassCard><Text style={ui.heading}>{arabic ? "نبدأ منين؟" : "Where shall we start?"}</Text>{(arabic ? ["اشرح لي خطة التمرين", "ساعدني ألاقي بديل لتمرين"] : ["Explain my training plan", "Help me find an exercise alternative"]).map(prompt => <AppButton key={prompt} label={prompt} variant="secondary" onPress={() => setMessage(prompt)} />)}</GlassCard> : null}
    {history.data?.map(entry => <GlassCard key={entry.id}><Text style={ui.small}>{entry.role === "coach" ? arabic ? "بنيان" : "Bonyan" : arabic ? "أنت" : "You"}</Text><Text selectable style={ui.text}>{entry.role === "coach" ? readableCoachText(entry.content) : entry.content}</Text></GlassCard>)}
    {proposals.map(id => <GlassCard key={id}><Text style={ui.text}>{arabic ? "الكوتش اقترح خطة. راجعها واعتمدها قبل أي تغيير." : "Coach proposed a draft plan. Review and approve before anything changes."}</Text><AppButton label={arabic ? "مراجعة الخطة المقترحة" : "Review proposed plan"} onPress={() => router.push({pathname: "/training/review", params: {planId: id}})} /><AppButton variant="secondary" label={arabic ? "رفض الاقتراح" : "Reject proposal"} onPress={() => setProposals(current => current.filter(value => value !== id))} /></GlassCard>)}
    {send.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{arabic ? "بنيان بيجهّز الرد…" : "Bonyan is preparing a reply…"}</Text> : null}
    {send.isError ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذّر إرسال الرسالة. كلامك موجود؛ حاول تاني." : "Couldn't send your message. Your text is still here; please retry."}</Text> : null}
  </CoachingPage>;
}
