import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { phrase } from "../../../core/i18n/copy";
import { colors, fonts } from "../../../core/theme/tokens";
import { getExerciseMediaAccess } from "../api/trainingApi";

/** Only the owner-authorized provider relay supplies media. Never infer another movement's image. */
export function ExerciseMedia({exerciseId, name, arabic = false, compact = false}: {exerciseId: string; name: string; arabic?: boolean; compact?: boolean}) {
  const [failed, setFailed] = useState<string | null>(null);
  const available = Boolean(exerciseId) && !exerciseId.startsWith("fallback-");
  const media = useQuery({queryKey: ["training", "exercise-media", exerciseId], queryFn: () => getExerciseMediaAccess(exerciseId), enabled: available, staleTime: 30_000, gcTime: 120_000});
  const url = media.data?.url;
  return <View style={[styles.frame, compact && styles.compact]}>
    {url && failed !== url ? <Image accessibilityLabel={name} source={{uri: url}} contentFit="contain" cachePolicy="memory" style={styles.image} onError={() => setFailed(url)} /> :
      <Pressable accessibilityRole={media.isError || failed ? "button" : undefined} disabled={!available || media.isLoading || media.data === null} onPress={() => {setFailed(null); void media.refetch();}} style={styles.placeholder}><Text numberOfLines={compact ? 2 : undefined} style={styles.copy}>{media.isLoading ? phrase("copy_a6e8ff074c0e", arabic) : phrase("copy_a921cc49ec65", arabic)}</Text>{!compact && (media.isError || failed) ? <Text style={styles.retry}>{phrase("copy_bb30cda7c34e", arabic)}</Text> : null}</Pressable>}
  </View>;
}
const styles = StyleSheet.create({frame: {backgroundColor: colors.canvas, minHeight: 160, borderRadius: 16, overflow: "hidden"}, compact: {width: 80, height: 80, minHeight: 80}, image: {width: "100%", height: "100%", minHeight: 80}, placeholder: {minHeight: 80, flex: 1, justifyContent: "center", alignItems: "center", padding: 8}, copy: {color: colors.mutedLight, fontFamily: fonts.body, fontSize: 11, textAlign: "center"}, retry: {color: colors.bronze, fontFamily: fonts.bodySemiBold, marginTop: 12}});
