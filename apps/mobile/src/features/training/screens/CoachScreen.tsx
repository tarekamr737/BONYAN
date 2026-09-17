import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { AppButton, AppTextField } from "../../../core/components";
import { getMyProfile } from "../../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
import { sendCoachMessage } from "../api/trainingApi";
import { readableCoachText } from "../coachText";

type Message = {role: "user" | "coach"; text: string};

export function CoachScreen() {
  const client = useQueryClient();
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => client.getQueryData<Message[]>(["coach-conversation"]) ?? []);
  const send = useMutation({mutationFn: (text: string) => sendCoachMessage(text), onSuccess: (response, text) => {
    setMessages(current => {const next: Message[] = [...current, {role: "user", text}, {role: "coach", text: response.response}]; client.setQueryData(["coach-conversation"], next); return next;});
    setMessage("");
    void client.invalidateQueries({queryKey: ["training"]});
  }});
  return <CoachingPage arabic={arabic} footer={<View style={{gap: 8}}><AppTextField label={arabic ? "رسالتك لبنيان" : "Your message to Bonyan"} multiline value={message} editable={!send.isPending} onChangeText={setMessage} maxLength={4000} placeholder={arabic ? "اسأل عن تدريبك…" : "Ask about your training?"} /><AppButton label={arabic ? "إرسال" : "Send"} loading={send.isPending} disabled={!message.trim()} onPress={() => send.mutate(message.trim())} /></View>}>
    <Text style={ui.title}>{arabic ? "الكوتش بنيان" : "Bonyan Coach"}</Text>
    <Text style={ui.text}>{arabic ? "خلينا ناخد تدريبك خطوة بخطوة. اسأل عن خطتك أو بديل لتمرين." : "Let's take training one step at a time. Ask about your plan or an exercise alternative."}</Text>
    {messages.length === 0 ? <GlassCard><Text style={ui.heading}>{arabic ? "نبدأ بإيه؟" : "Where shall we start?"}</Text>{(arabic ? ["اشرح لي خطة تمريني", "ساعدني أختار بديل لتمرين"] : ["Explain my training plan", "Help me find an exercise alternative"]).map(prompt => <AppButton key={prompt} label={prompt} variant="secondary" onPress={() => setMessage(prompt)} />)}</GlassCard> : null}
    {messages.map((entry, index) => <GlassCard key={index}><Text style={ui.small}>{entry.role === "coach" ? arabic ? "بنيان" : "Bonyan" : arabic ? "أنت" : "You"}</Text><Text selectable style={ui.text}>{entry.role === "coach" ? readableCoachText(entry.text) : entry.text}</Text></GlassCard>)}
    {send.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{arabic ? "بنيان بيجهّز الرد…" : "Bonyan is preparing a reply…"}</Text> : null}
    {send.isError ? <Text accessibilityRole="alert" style={ui.error}>{arabic ? "تعذّر إرسال الرسالة. كلامك موجود؛ حاول تاني." : "Couldn't send your message. Your text is still here; please retry."}</Text> : null}
  </CoachingPage>;
}
