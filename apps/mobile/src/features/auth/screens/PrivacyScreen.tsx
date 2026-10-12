import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, Share, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../../core/api/client";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import type { MessageKey } from "../../../core/i18n/messages";
import { colors, fonts, spacing } from "../../../core/theme/tokens";

type Permissions = {display_name: boolean; avatar: boolean; badges: boolean; progress: boolean; posts: boolean};
const labels: Record<keyof Permissions, MessageKey> = {display_name: "shareName", avatar: "shareAvatar", badges: "shareBadges", progress: "shareProgress", posts: "sharePosts"};
export function PrivacyScreen() {
  const {t} = useLocale(); const client = useQueryClient();
  const preferences = useQuery({queryKey: ["privacy"], queryFn: () => apiRequest<Permissions>("/api/v1/users/me/privacy")});
  const blocks = useQuery({queryKey: ["privacy", "blocks"], queryFn: () => apiRequest<string[]>("/api/v1/users/me/privacy/blocks")});
  const save = useMutation({mutationFn: (change: Partial<Permissions>) => apiRequest<Permissions>("/api/v1/users/me/privacy", {method: "PUT", body: change}), onSuccess: (value) => {client.setQueryData(["privacy"], value); for(const key of ["community", "avatars", "game"]) void client.invalidateQueries({queryKey: [key]});}});
  const unblock = useMutation({mutationFn: (id: string) => apiRequest(`/api/v1/users/me/privacy/blocks/${encodeURIComponent(id)}`, {method: "DELETE"}), onSuccess: () => {void client.invalidateQueries({queryKey: ["privacy", "blocks"]}); void client.invalidateQueries({queryKey: ["community"]});}});
  const exportData = useMutation({mutationFn: async () => {const data = await apiRequest("/api/v1/users/me/export"); await Share.share({title: "BONYAN", message: JSON.stringify(data, null, 2)});}});
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.control}><Text style={styles.label}>{t("cancel")}</Text></Pressable>
    <Text style={styles.title}>{t("privacySettings")}</Text><Text style={styles.copy}>{t("bodyAlwaysPrivate")}</Text>
    <Pressable accessibilityRole="button" disabled={exportData.isPending} style={styles.control} onPress={() => exportData.mutate()}><Text style={styles.label}>{t("exportData")}</Text></Pressable>
    {exportData.error ? <Text accessibilityRole="alert" style={styles.copy}>{exportData.error.message}</Text> : null}
    <SurfaceCard>{preferences.data ? Object.entries(labels).map(([key, label]) => <View key={key} style={styles.row}><Text style={styles.copy}>{t(label)}</Text><Switch accessibilityLabel={t(label)} value={preferences.data[key as keyof Permissions]} disabled={save.isPending} onValueChange={value => save.mutate({[key]: value})} trackColor={{true: colors.bronze}}/></View>) : <Text style={styles.copy}>{preferences.isError ? t("request_failed") : t("loading")}</Text>}</SurfaceCard>
    {preferences.isError ? <Pressable accessibilityRole="button" style={styles.control} onPress={() => void preferences.refetch()}><Text style={styles.label}>{t("retry")}</Text></Pressable> : null}
    {save.error || unblock.error ? <Text accessibilityRole="alert" style={styles.copy}>{(save.error ?? unblock.error)?.message}</Text> : null}
    <Text style={styles.title}>{t("blockedMembers")}</Text>
    {blocks.data?.map(id => <Pressable accessibilityRole="button" key={id} style={styles.control} disabled={unblock.isPending} onPress={() => unblock.mutate(id)}><Text style={styles.label}>{t("unblock")}</Text></Pressable>)}
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({page: {flex: 1, backgroundColor: colors.canvas}, content: {padding: spacing.lg, gap: spacing.md}, title: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 24}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, flexShrink: 1}, label: {color: colors.bronze, fontFamily: fonts.bodySemiBold}, control: {minHeight: 50, justifyContent: "center"}, row: {minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md}});
