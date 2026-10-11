import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Share, TextInput, View } from "react-native";
import { DirectionalText as Text } from "../../core/components/DirectionalText";
import { SurfaceCard } from "../../core/components/SurfaceCard";
import { useLocale } from "../../core/i18n/LocaleProvider";
import { formatDate, formatNumber, type MessageKey } from "../../core/i18n/messages";
import { createChallenge, getChallenges, getFriends, inviteFriend, replyChallenge, replyFriend } from "./api";
import { Action, GamePage, gameStyles as styles, QueryNotice } from "./GamePage";

const statusCopy: Record<string, MessageKey> = {pending: "pendingInvite", invited: "pendingInvite", accepted: "acceptedFriend", declined: "declinedInvite", active: "activeChallenge", expired: "expiredChallenge", completed: "completedChallenge"};
const categoryCopy: Record<string, MessageKey> = {workout: "plannedWorkouts", nutrition: "nutritionHabits", recovery: "activeRecovery"};
export function ChallengesScreen() {
  const {t, locale} = useLocale(); const client = useQueryClient(); const [code, setCode] = useState("");
  const friends = useQuery({queryKey: ["game", "friends"], queryFn: getFriends});
  const challenges = useQuery({queryKey: ["game", "challenges"], queryFn: getChallenges});
  const refresh = () => void client.invalidateQueries({queryKey: ["game"]});
  const invite = useMutation({mutationFn: () => inviteFriend(code.trim()), onSuccess: () => {setCode(""); refresh();}});
  const friendReply = useMutation({mutationFn: ({id, accept}: {id: string; accept: boolean}) => replyFriend(id, accept), onSuccess: refresh});
  const challengeReply = useMutation({mutationFn: ({id, accept}: {id: string; accept: boolean}) => replyChallenge(id, accept), onSuccess: refresh});
  const create = useMutation({mutationFn: ({id, category}: {id: string; category: string}) => createChallenge(id, category), onSuccess: refresh});
  const busy = invite.isPending || friendReply.isPending || challengeReply.isPending || create.isPending;
  const error = invite.error ?? friendReply.error ?? challengeReply.error ?? create.error;
  return <GamePage title={t("inviteFriends")}>
    <Text style={styles.copy}>{t("challengeHelp")}</Text>
    <QueryNotice pending={friends.isPending} error={friends.error} retry={() => void friends.refetch()}/>
    {friends.data ? <>
      <SurfaceCard><Text style={styles.copy}>{t("inviteCode")}</Text><Text selectable style={[styles.copy, {writingDirection: "ltr"}]}>{friends.data.invite_code}</Text><Action label={t("shareInvite")} onPress={() => void Share.share({message: friends.data!.invite_code})}/></SurfaceCard>
      <TextInput accessibilityLabel={t("enterInvite")} placeholder={t("enterInvite")} placeholderTextColor="#8B8882" autoCapitalize="none" autoCorrect={false} value={code} onChangeText={setCode} style={[styles.input, {writingDirection: "ltr"}]}/>
      <Action label={t("sendInvite")} disabled={busy || !code.trim()} onPress={() => invite.mutate()}/>
      {!friends.data.items.length ? <Text style={styles.copy}>{t("noFriends")}</Text> : friends.data.items.map(friend => <SurfaceCard key={friend.id}>
        <Text style={styles.title}>{friend.display_name === "BONYAN member" ? t("communityMember") : friend.display_name}</Text><Text style={styles.copy}>{t(statusCopy[friend.status] ?? "pendingInvite")}</Text>
        {friend.incoming && friend.status === "pending" ? <View style={styles.row}><Action label={t("accept")} disabled={busy} onPress={() => friendReply.mutate({id: friend.id, accept: true})}/><Action label={t("decline")} disabled={busy} onPress={() => friendReply.mutate({id: friend.id, accept: false})}/></View> : null}
        {friend.status === "accepted" ? (["workout", "nutrition", "recovery"] as const).map(category => <Action key={category} label={`${t("challenge")} · ${t(categoryCopy[category] ?? "challenge")}`} disabled={busy} onPress={() => create.mutate({id: friend.id, category})}/>) : null}
      </SurfaceCard>)}
    </> : null}
    <Text style={styles.title}>{t("challenges")}</Text>
    <QueryNotice pending={challenges.isPending} error={challenges.error} retry={() => void challenges.refetch()}/>
    {challenges.data?.length === 0 ? <Text style={styles.copy}>{t("noChallenges")}</Text> : challenges.data?.map(challenge => <SurfaceCard key={challenge.id}>
      <Text style={styles.title}>{t(categoryCopy[challenge.category] ?? "challenge")}</Text><Text style={styles.copy}>{t(statusCopy[challenge.status] ?? "pendingInvite")}</Text>
      <Text style={styles.copy}>{formatDate(challenge.ends_at, locale, "UTC")}</Text>
      <Text style={styles.copy}>{t("you")}: {formatNumber(challenge.my_points, locale)} / {formatNumber(challenge.target_points, locale)} · {t("friends")}: {formatNumber(challenge.friend_points, locale)} / {formatNumber(challenge.target_points, locale)}</Text>
      {challenge.incoming && challenge.status === "invited" ? <View style={styles.row}><Action label={t("accept")} disabled={busy} onPress={() => challengeReply.mutate({id: challenge.id, accept: true})}/><Action label={t("decline")} disabled={busy} onPress={() => challengeReply.mutate({id: challenge.id, accept: false})}/></View> : null}
    </SurfaceCard>)}
    {error ? <Text accessibilityRole="alert" style={styles.copy}>{error.message}</Text> : null}
  </GamePage>;
}
