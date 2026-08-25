import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

export function BodyFigurePreview() {
  return (
    <View
      accessibilityLabel="Anonymous full-body avatar preview"
      accessibilityRole="image"
      style={styles.stage}
    >
      <View style={styles.halo} />
      <View style={styles.figure}>
        <View style={styles.head} />
        <View style={styles.neck} />
        <View style={styles.leftArm} />
        <View style={styles.rightArm} />
        <View style={styles.torso}>
          <View style={styles.torsoSeam} />
        </View>
        <View style={styles.waistBand} />
        <View style={styles.leftLeg} />
        <View style={styles.rightLeg} />
        <View style={styles.leftShoe} />
        <View style={styles.rightShoe} />
      </View>
      <View style={styles.captionBadge}>
        <Text style={styles.caption}>MEASUREMENTS → SHAPE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    aspectRatio: 0.72,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  halo: {
    backgroundColor: colors.bronzeSoft,
    borderRadius: 180,
    height: "78%",
    position: "absolute",
    width: "72%",
  },
  figure: { height: 420, maxHeight: "84%", position: "relative", width: 210 },
  head: {
    backgroundColor: "#C99A67",
    borderRadius: 30,
    height: 60,
    left: 75,
    position: "absolute",
    top: 0,
    width: 60,
  },
  neck: {
    backgroundColor: "#AA794F",
    height: 28,
    left: 91,
    position: "absolute",
    top: 51,
    width: 28,
  },
  torso: {
    backgroundColor: "#303235",
    borderColor: colors.bronzeBorder,
    borderRadius: 38,
    borderWidth: 2,
    height: 158,
    left: 47,
    position: "absolute",
    top: 70,
    width: 116,
  },
  torsoSeam: {
    backgroundColor: "#484A4D",
    height: 112,
    left: 56,
    position: "absolute",
    top: 22,
    width: 2,
  },
  leftArm: {
    backgroundColor: "#303235",
    borderRadius: 18,
    height: 174,
    left: 30,
    position: "absolute",
    top: 82,
    transform: [{ rotate: "7deg" }],
    width: 30,
  },
  rightArm: {
    backgroundColor: "#303235",
    borderRadius: 18,
    height: 174,
    position: "absolute",
    right: 30,
    top: 82,
    transform: [{ rotate: "-7deg" }],
    width: 30,
  },
  waistBand: {
    backgroundColor: colors.bronze,
    borderRadius: radii.pill,
    height: 8,
    left: 57,
    position: "absolute",
    top: 218,
    width: 96,
  },
  leftLeg: {
    backgroundColor: "#1E2022",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    height: 174,
    left: 61,
    position: "absolute",
    top: 224,
    transform: [{ rotate: "2deg" }],
    width: 42,
  },
  rightLeg: {
    backgroundColor: "#1E2022",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    height: 174,
    position: "absolute",
    right: 61,
    top: 224,
    transform: [{ rotate: "-2deg" }],
    width: 42,
  },
  leftShoe: {
    backgroundColor: "#101112",
    borderRadius: 10,
    bottom: 4,
    height: 24,
    left: 53,
    position: "absolute",
    width: 55,
  },
  rightShoe: {
    backgroundColor: "#101112",
    borderRadius: 10,
    bottom: 4,
    height: 24,
    position: "absolute",
    right: 53,
    width: 55,
  },
  captionBadge: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    bottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  caption: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
});
