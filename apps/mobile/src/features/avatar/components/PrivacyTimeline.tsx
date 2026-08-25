import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../../core/theme/tokens";

const privacySteps = [
  ["Data", "Confirmed measurements, never posted"],
  ["Shape", "Skinny, Slim, Normal, Fit or Strong"],
  ["Review", "Your avatar stays private until approval"],
  ["Community", "Off until you enable it"],
] as const;

export function PrivacyTimeline() {
  return (
    <View accessibilityLabel="Body avatar privacy stages" style={styles.container}>
      {privacySteps.map(([title, detail], index) => (
        <View key={title} style={styles.step}>
          <View style={styles.markerColumn}>
            <View style={styles.marker} />
            {index < privacySteps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  step: { flexDirection: "row", minHeight: 54 },
  markerColumn: { alignItems: "center", marginRight: spacing.sm, width: 14 },
  marker: {
    backgroundColor: colors.bronze,
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  line: { backgroundColor: colors.bronzeBorder, flex: 1, marginVertical: 4, width: 1 },
  copy: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  detail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
