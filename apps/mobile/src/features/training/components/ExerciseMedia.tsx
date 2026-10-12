import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppButton} from "../../../core/components/AppButton";
import {useLocale} from "../../../core/i18n/LocaleProvider";
import {ExerciseVideo} from "./ExerciseVideo";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { phrase } from "../../../core/i18n/copy";
import { colors, fonts } from "../../../core/theme/tokens";
import { getExerciseMediaAccess } from "../api/trainingApi";

/** Only the owner-authorized provider relay supplies media. Never infer another movement's image. */
export function ExerciseMedia({exerciseId, name, arabic = false, compact = false, previewSize = 80}: {exerciseId: string; name: string; arabic?: boolean; compact?: boolean; previewSize?: number}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const {t} = useLocale();
  const available = Boolean(exerciseId) && !exerciseId.startsWith("fallback-");
  const media = useQuery({queryKey: ["training", "exercise-media", exerciseId], queryFn: () => getExerciseMediaAccess(exerciseId), enabled: available, staleTime: 30_000, gcTime: 120_000});
  const url = media.data?.url;
  const video = media.data?.media_type?.startsWith("video/");
  return <View><View style={[styles.frame, compact && {width: previewSize, height: previewSize}]}>
    {url && failed !== url ? video ? compact ? <Pressable accessibilityRole="button" accessibilityLabel={`${t("playDemo")}: ${name}`} style={styles.placeholder} onPress={event => {event.stopPropagation(); setOpened(true);}}><Text style={styles.retry}>▶</Text><Text style={styles.copy}>{t("playDemo")}</Text></Pressable> : <ExerciseVideo key={url} url={url} name={name} onError={() => setFailed(url)}/> : <Image accessibilityLabel={name} source={{uri: url}} contentFit="contain" cachePolicy="memory" style={styles.image} onError={() => setFailed(url)} /> :
      <Pressable accessibilityRole={media.isError || failed ? "button" : undefined} disabled={!available || media.isLoading || media.data === null} onPress={() => {setFailed(null); void media.refetch();}} style={styles.placeholder}><Text numberOfLines={compact ? 2 : undefined} style={styles.copy}>{media.isLoading ? phrase("copy_a6e8ff074c0e", arabic) : phrase("copy_a921cc49ec65", arabic)}</Text>{!compact && (media.isError || failed) ? <Text style={styles.retry}>{phrase("copy_bb30cda7c34e", arabic)}</Text> : null}</Pressable>}
  </View>{!compact && media.data?.source_name ? <Text style={[styles.copy, {marginTop: 8}]}>{t("mediaSource")}: {media.data.source_name}</Text> : null}{url && video && compact ? <Modal visible={opened} animationType="none" onRequestClose={() => setOpened(false)}><SafeAreaView style={{flex: 1, backgroundColor: colors.canvas, padding: 24, gap: 24}}><AppButton label={t("back")} variant="secondary" onPress={() => setOpened(false)}/><Text style={styles.retry}>{name}</Text>{opened ? <ExerciseVideo key={url} url={url} name={name} onError={() => {setFailed(url); setOpened(false);}}/> : null}{media.data?.source_name ? <Text style={styles.copy}>{t("mediaSource")}: {media.data.source_name}</Text> : null}</SafeAreaView></Modal> : null}</View>;
}
const styles = StyleSheet.create({frame: {backgroundColor: colors.canvas, height: 240, borderRadius: 16, overflow: "hidden"}, compact: {width: 80, height: 80}, image: {width: "100%", height: "100%"}, placeholder: {minHeight: 80, flex: 1, justifyContent: "center", alignItems: "center", padding: 8}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 11, textAlign: "center"}, retry: {color: colors.bronze, fontFamily: fonts.bodySemiBold, marginTop: 12}});
