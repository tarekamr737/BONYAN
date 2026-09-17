import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { StyleSheet, View } from "react-native";

import { colors, fonts, spacing } from "../../../core/theme/tokens";

const privacySteps = [
  ["Source", "Private photo and confirmed measurements"],
  ["Shape", "Skinny, Slim, Normal, Fit, Strong or Full"],
  ["Review", "Your avatar stays private until approval"],
  ["Community", "Off until you enable it"],
] as const;

const privacyStepsArabic = [
  ["المصدر", "صورة خاصة وقياسات مؤكدة"],
  ["الشكل", "تقدير حسب قياسات جسمك الحالية"],
  ["المراجعة", "صورتك تفضل خاصة لحد ما تعتمدها"],
  ["المجتمع", "مقفولة لحد ما تفعّلها بنفسك"],
] as const;

export function PrivacyTimeline({ arabic = false }: { arabic?: boolean }) {
  const steps = arabic ? privacyStepsArabic : privacySteps;
  return (
    <View accessibilityLabel={arabic ? "مراحل خصوصية الصورة" : "Body avatar privacy stages"} style={styles.container}>
      {steps.map(([title, detail], index) => (
        <View key={title} style={styles.step}>
          <View style={styles.markerColumn}>
            <View style={styles.marker} />
            {index < steps.length - 1 ? <View style={styles.line} /> : null}
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
