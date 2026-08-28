/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses Three.js props. */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import type { AvatarPresentation, BodyShapeProfile } from "../types";
import { AvatarBody3D } from "./AvatarBody3D";
import { Canvas } from "./AvatarCanvas";

type GameAvatar3DProps = {
  presentation: AvatarPresentation;
  shape: BodyShapeProfile;
};

export function GameAvatar3D({ presentation, shape }: GameAvatar3DProps) {
  const [rotation, setRotation] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [loadedPresentation, setLoadedPresentation] = useState<AvatarPresentation | null>(null);
  const drag = useRef({ startX: 0, startRotation: 0 });
  const modelReady = loadedPresentation === presentation;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  const markModelReady = useCallback(
    () => setLoadedPresentation(presentation),
    [presentation],
  );

  function startDrag(event: GestureResponderEvent) {
    if (!modelReady) return;
    drag.current = { startX: event.nativeEvent.pageX, startRotation: rotation };
  }

  function moveDrag(event: GestureResponderEvent) {
    if (!modelReady) return;
    const delta = event.nativeEvent.pageX - drag.current.startX;
    setRotation(drag.current.startRotation + delta * 0.014);
  }

  function rotateBy(amount: number) {
    setRotation((current) => current + amount);
  }

  const degrees = Math.round((((rotation * 180) / Math.PI) % 360 + 360) % 360);

  return (
    <View
      accessibilityLabel={
        modelReady
          ? `Interactive 3D ${presentation} avatar, ${shape} shape, rotated ${degrees} degrees`
          : `Loading 3D ${presentation} avatar`
      }
      accessibilityLiveRegion="polite"
      onMoveShouldSetResponder={() => modelReady}
      onResponderGrant={startDrag}
      onResponderMove={moveDrag}
      onStartShouldSetResponder={() => modelReady}
      style={styles.stage}
    >
      <Canvas camera={{ fov: 32, position: [0, 1.35, 11.4] }} shadows>
        <color args={["#090d10"]} attach="background" />
        <ambientLight intensity={0.9} />
        <hemisphereLight color="#dce9ef" groundColor="#14100d" intensity={1.25} />
        <directionalLight castShadow color="#ffd7b3" intensity={2.7} position={[4, 7, 6]} />
        <pointLight color="#38c7d1" intensity={7} position={[-4, 3, 1]} />
        <pointLight color="#c78c5d" intensity={5} position={[4, 0, 3]} />
        <Suspense fallback={null}>
          <AvatarBody3D
            onReady={markModelReady}
            presentation={presentation}
            reduceMotion={reduceMotion}
            rotation={rotation}
            shape={shape}
          />
        </Suspense>
        <mesh receiveShadow position={[0, -2.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.25, 64]} />
          <meshStandardMaterial color="#101519" metalness={0.35} roughness={0.42} />
        </mesh>
        <mesh position={[0, -2.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.38, 0.035, 12, 96]} />
          <meshStandardMaterial color="#d49a66" emissive="#d49a66" emissiveIntensity={0.85} />
        </mesh>
      </Canvas>
      {!modelReady ? (
        <View pointerEvents="none" style={styles.loadingState}>
          <ActivityIndicator color={colors.bronze} size="small" />
          <Text style={styles.loadingTitle}>Preparing your 3D model</Text>
          <Text style={styles.loadingCaption}>Loading the detailed body, outfit and rig…</Text>
        </View>
      ) : null}
      <View pointerEvents="box-none" style={styles.hud}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{modelReady ? "LIVE 3D" : "LOADING 3D"}</Text>
        </View>
        <Text style={styles.shapeText}>{`${shape.toUpperCase()} · ${degrees}°`}</Text>
      </View>
      <View pointerEvents="box-none" style={styles.controls}>
        <Pressable
          accessibilityLabel="Rotate avatar left"
          accessibilityRole="button"
          disabled={!modelReady}
          onPress={() => rotateBy(-Math.PI / 4)}
          style={[styles.rotateButton, !modelReady && styles.controlDisabled]}
        >
          <View style={[styles.chevron, styles.chevronLeft]} />
        </Pressable>
        <Text style={styles.hint}>{reduceMotion ? "Drag to rotate" : "Drag to rotate · Idle animation"}</Text>
        <Pressable
          accessibilityLabel="Rotate avatar right"
          accessibilityRole="button"
          disabled={!modelReady}
          onPress={() => rotateBy(Math.PI / 4)}
          style={[styles.rotateButton, !modelReady && styles.controlDisabled]}
        >
          <View style={[styles.chevron, styles.chevronRight]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    aspectRatio: 2 / 3,
    backgroundColor: "#090d10",
    borderRadius: radii.card,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  loadingState: {
    alignItems: "center",
    backgroundColor: "rgba(9, 13, 16, 0.82)",
    bottom: 0,
    gap: spacing.xs,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  loadingCaption: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  hud: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(9, 13, 16, 0.82)",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  liveDot: { backgroundColor: colors.bronze, borderRadius: 4, height: 8, width: 8 },
  liveText: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.1 },
  shapeText: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  controls: {
    alignItems: "center",
    bottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
  },
  rotateButton: {
    alignItems: "center",
    backgroundColor: "rgba(9, 13, 16, 0.88)",
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  controlDisabled: { opacity: 0.42 },
  chevron: {
    borderColor: colors.text,
    borderTopWidth: 2,
    borderRightWidth: 2,
    height: 12,
    width: 12,
  },
  chevronLeft: { transform: [{ rotate: "-135deg" }] },
  chevronRight: { transform: [{ rotate: "45deg" }] },
  hint: {
    backgroundColor: "rgba(9, 13, 16, 0.82)",
    borderRadius: radii.pill,
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
});
