import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { coachingCopy } from "../coachingCopy";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { AppButton } from "../../../core/components";
import { getAssessment, getProfileHistory } from "../api/profileApi";
import { goalLabel } from "../journey";
import type { UserProfile } from "../types";
import { AssessmentEditor } from "./AssessmentEditor";
import { GlassCard, ScoreCard, ui } from "./CoachingUI";

export function ProfileOverview({profile, onEdit}: {profile: UserProfile; onEdit: () => void}) {
  const [historyCutoff] = useState(() => Date.now());
  const [period, setPeriod] = useState<1 | 7 | 30 | null>(null);
  const [adding, setAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const overview = useQuery({queryKey: ["assessment"], queryFn: getAssessment});
  const history = useInfiniteQuery({queryKey: ["profile-history"], queryFn: ({pageParam}) => getProfileHistory(pageParam), initialPageParam: 0, getNextPageParam: (last, pages) => last.length === 30 ? pages.length * 30 : undefined, enabled: showHistory});
  const arabic = profile.preferred_language.startsWith("ar");
  const entries = (history.data?.pages.flat() ?? []).filter(item => period === null || new Date(item.created_at).getTime() >= historyCutoff - period * 86400000);
  return <View style={ui.stack}>
    <GlassCard><Text style={ui.heading}>{profile.display_name}</Text><Text style={ui.text}>{goalLabel(profile.training_goal, arabic)}</Text>{profile.training_goal === "military_preparation" ? <Text style={ui.small}>{coachingCopy(profile.coaching?.military_subtype ?? "", arabic)}{profile.coaching?.target_date ? ` · ${profile.coaching.target_date}` : ""}</Text> : null}<Text style={ui.text}>{profile.available_training_days} {coachingCopy("days / week", arabic)} · {coachingCopy(profile.experience_level ?? "", arabic)}</Text><Text style={ui.small}>{profile.available_equipment.map(value => coachingCopy(value, arabic)).join(" · ")}</Text><AppButton label={arabic ? "تعديل الهدف والإعدادات" : "Edit goal & preferences"} onPress={onEdit} variant="secondary" /></GlassCard>
    {overview.isPending ? <Text style={ui.text}>{coachingCopy("Loading your assessment\u2026", arabic)}</Text> : null}
    {overview.isError ? <AppButton label={coachingCopy("Retry assessment", arabic)} onPress={() => void overview.refetch()} variant="secondary" /> : null}
    {overview.data ? <><View style={ui.row}><Text style={[ui.heading, {flex: 1}]}>{coachingCopy("Profile", arabic)} {overview.data.completion}% {coachingCopy("complete", arabic)}</Text></View>{overview.data.missing_profile.length ? <Text style={ui.small}>{coachingCopy("Useful next additions", arabic)}: {overview.data.missing_profile.map(v => coachingCopy(v, arabic)).join(", ")}.</Text> : null}<ScoreCard score={overview.data.score} arabic={arabic} />
      {overview.data.latest ? <GlassCard><Text style={ui.heading}>{coachingCopy("Current body assessment", arabic)}</Text><Text style={ui.small}>{overview.data.latest.snapshot.source === "inbody" ? "InBody" : coachingCopy("Manual", arabic)} · {new Date(overview.data.latest.created_at).toLocaleDateString()}</Text><View style={ui.row}>{Object.entries(overview.data.latest.snapshot.measurements ?? {}).filter(([,value]) => value !== null).map(([key, value]) => <Text key={key} style={ui.text}>{coachingCopy(key, arabic)}: {value}</Text>)}</View></GlassCard> : <Text style={ui.text}>{coachingCopy("You haven\u2019t added an assessment yet. Start with measurements or a confirmed InBody report.", arabic)}</Text>}
    </> : null}
    <AppButton label={coachingCopy(adding ? "Close assessment" : "Add body assessment", arabic)} variant="secondary" onPress={() => setAdding(!adding)} />
    {adding ? <AssessmentEditor height={profile.height_cm ?? ""} arabic={arabic} onSaved={() => setAdding(false)} /> : null}
    <AppButton label={coachingCopy(showHistory ? "Hide history" : "Progress & assessment history", arabic)} onPress={() => setShowHistory(!showHistory)} variant="secondary" />
    {showHistory ? <View style={ui.stack}><Text style={ui.heading}>{coachingCopy("Your history", arabic)}</Text><View style={ui.row}>{([1, 7, 30, null] as const).map((value, index) => <AppButton key={String(value)} variant={period === value ? "primary" : "secondary"} label={(arabic ? ["يوم", "أسبوع", "شهر", "الكل"] : ["Day", "Week", "Month", "All"])[index] ?? ""} onPress={() => setPeriod(value)} />)}</View><Text style={ui.small}>{arabic ? "السجل المحمّل فقط. حمّل السجلات الأقدم لعرض المزيد. التغيرات القصيرة لا تثبت تغير الدهون أو العضلات." : "Showing loaded history. Load earlier entries for more. Short-term changes do not establish fat or muscle change."}</Text>{history.isPending ? <Text style={ui.text}>{coachingCopy("Loading your timeline\u2026", arabic)}</Text> : null}{history.isError ? <AppButton label={coachingCopy("Retry history", arabic)} onPress={() => void history.refetch()} /> : null}{!history.isPending && !history.isError && entries.length === 0 ? <Text style={ui.text}>{coachingCopy("Your next assessment or profile update will appear here. Previous entries stay available as you progress.", arabic)}</Text> : null}{entries.map(item => <GlassCard key={item.id}><Text style={ui.small}>{new Date(item.created_at).toLocaleString()}</Text><Text style={ui.heading}>{coachingCopy(item.kind, arabic)}</Text><Text style={ui.text}>{item.snapshot.source === "inbody" ? "InBody" : item.snapshot.source === "manual" ? coachingCopy("Manual entry", arabic) : goalLabel(item.snapshot.profile?.training_goal, arabic)}</Text>{item.snapshot.measurements ? <Text style={ui.text}>{Object.entries(item.snapshot.measurements).filter(([,v]) => v !== null).map(([k,v]) => `${coachingCopy(k, arabic)}: ${v}`).join(" · ")}</Text> : null}{item.snapshot.score?.value != null ? <Text style={ui.text}>{coachingCopy("Target progress", arabic)}: {item.snapshot.score.value}/100 · {coachingCopy("coverage", arabic)} {item.snapshot.score.coverage}%</Text> : null}{item.snapshot.changed_fields ? <Text style={ui.small}>{item.snapshot.changed_fields.map(v => coachingCopy(v, arabic)).join(" · ")}</Text> : null}</GlassCard>)}{history.hasNextPage ? <AppButton label={coachingCopy("Load earlier entries", arabic)} loading={history.isFetchingNextPage} onPress={() => void history.fetchNextPage()} variant="secondary" /> : null}</View> : null}
    <AppButton label={coachingCopy("Continue to training", arabic)} onPress={() => router.push("/training")} />
  </View>;
}
