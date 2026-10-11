import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {DirectionalText as Text} from "../../core/components/DirectionalText";
import {SurfaceCard} from "../../core/components/SurfaceCard";
import {apiRequest} from "../../core/api/client";
import {useLocale} from "../../core/i18n/LocaleProvider";
import {type MessageKey} from "../../core/i18n/messages";
import {Action, GamePage, QueryNotice, gameStyles} from "../game/GamePage";

export const getModerationRole = () => apiRequest<{can_moderate: boolean}>("/api/v1/community/moderation/role");
type Report = {id: string; post_id: string; caption: string; reason: string; note: string | null};
const reasonKeys: Record<string, MessageKey> = {spam: "reportSpam", harassment: "reportHarassment", privacy: "reportPrivacy", other: "reportOther"};
export function ModerationScreen() {
  const {t} = useLocale(); const client = useQueryClient(); const [before, setBefore] = useState<string>();
  const queue = useQuery({queryKey: ["community", "moderation", before], queryFn: () => apiRequest<{items: Report[]; next_cursor: string | null}>(`/api/v1/community/moderation/reports${before ? `?before=${encodeURIComponent(before)}` : ""}`)});
  const decision = useMutation({mutationFn: ({id, decision}: {id: string; decision: "hide" | "dismiss"}) => apiRequest(`/api/v1/community/moderation/reports/${id}/decision`, {method: "POST", body: {decision}}), onSuccess: () => void client.invalidateQueries({queryKey: ["community"]})});
  return <GamePage title={t("moderation")}><QueryNotice pending={queue.isPending} error={queue.error} retry={() => void queue.refetch()}/>{queue.data?.items.length === 0 ? <Text style={gameStyles.copy}>{t("noReports")}</Text> : queue.data?.items.map(report => <SurfaceCard key={report.id}><Text style={gameStyles.title}>{t(reasonKeys[report.reason] ?? "reportOther")}</Text><Text style={gameStyles.copy}>{report.caption}</Text>{report.note ? <Text style={gameStyles.copy}>{report.note}</Text> : null}<Action label={t("hidePost")} disabled={decision.isPending} onPress={() => decision.mutate({id: report.id, decision: "hide"})}/><Action label={t("dismissReport")} disabled={decision.isPending} onPress={() => decision.mutate({id: report.id, decision: "dismiss"})}/></SurfaceCard>)}{queue.data?.next_cursor ? <Action label={t("loadMore")} onPress={() => setBefore(queue.data!.next_cursor!)}/> : null}{decision.error ? <Text accessibilityRole="alert" style={gameStyles.copy}>{decision.error.message}</Text> : null}</GamePage>;
}
