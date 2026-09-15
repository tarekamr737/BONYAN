import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { getApiBaseUrl } from "../api/client";
import { getAccessToken } from "../auth/session";
import { colors, fonts } from "../theme/tokens";
import { DirectionalText as Text } from "./DirectionalText";

type ProfileAvatarProps = {
  accessibilityLabel: string;
  displayName?: string | null;
  hasPhoto?: boolean;
  onPress?: () => void;
  photoUpdatedAt?: string | null;
  size?: number;
};

export function ProfileAvatar({
  accessibilityLabel,
  displayName,
  hasPhoto = false,
  onPress,
  photoUpdatedAt,
  size = 56,
}: ProfileAvatarProps) {
  const [failedVersion, setFailedVersion] = useState<string | null>(null);
  const [webPhoto, setWebPhoto] = useState<{ uri: string; version: string } | null>(null);
  const photoVersion = photoUpdatedAt ?? "1";

  const token = getAccessToken();
  const photoUrl = `${getApiBaseUrl()}/api/v1/me/photo?v=${encodeURIComponent(photoVersion)}`;
  useEffect(() => {
    if (Platform.OS !== "web" || !hasPhoto || failedVersion === photoVersion) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void fetch(photoUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Profile photo unavailable");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setWebPhoto({ uri: objectUrl, version: photoVersion });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailedVersion(photoVersion);
        }
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [failedVersion, hasPhoto, photoUrl, photoVersion, token]);

  const source = Platform.OS === "web"
    ? hasPhoto && webPhoto?.version === photoVersion ? { uri: webPhoto.uri } : null
    : hasPhoto && failedVersion !== photoVersion
    ? {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        uri: photoUrl,
      }
    : null;
  const initial = displayName?.trim().charAt(0).toLocaleUpperCase() || null;
  const content = source ? (
    <Image
      onError={() => setFailedVersion(photoVersion)}
      source={source}
      style={StyleSheet.absoluteFill}
    />
  ) : initial ? (
    <Text style={[styles.initial, { fontSize: size * 0.36 }]}>{initial}</Text>
  ) : (
    <Feather color={colors.text} name="user" size={size * 0.4} />
  );

  const sharedStyle = [styles.avatar, { borderRadius: size / 2, height: size, width: size }];
  if (!onPress) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        accessible
        style={sharedStyle}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [sharedStyle, { opacity: pressed ? 0.72 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: "rgba(200, 168, 107, 0.45)",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: {
    color: colors.bronze,
    fontFamily: fonts.displaySemiBold,
  },
});
