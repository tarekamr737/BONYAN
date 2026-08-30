import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../components/SurfaceCard";
import { useAuthSession } from "../auth/session";
import { colors, fonts, radii, spacing } from "../theme/tokens";

const foundations = ["EXPO ROUTER", "TANSTACK QUERY", "TYPED API"] as const;

export function HomeScreen() {
  const { isAuthenticated } = useAuthSession();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topline}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>CORE PLATFORM · ONLINE</Text>
        </View>

        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.wordmark}>
            BONYAN
          </Text>
          <Text style={styles.eyebrow}>BUILD HUMAN POTENTIAL</Text>
          <Text style={styles.intro}>
            The shared foundation is ready for focused feature workstreams.
          </Text>
        </View>

        <SurfaceCard>
          <Text style={styles.cardLabel}>FOUNDATION / 01</Text>
          <Text style={styles.cardTitle}>One platform. Clear boundaries.</Text>
          <View style={styles.rule} />
          <View style={styles.foundationList}>
            {foundations.map((foundation, index) => (
              <View key={foundation} style={styles.foundationRow}>
                <Text style={styles.foundationIndex}>0{index + 1}</Text>
                <Text style={styles.foundationName}>{foundation}</Text>
                <Text style={styles.foundationState}>READY</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {isAuthenticated ? (
          <View accessibilityLabel="Feature navigation" style={styles.featureActions}>
            <Link asChild href="./inbody">
              <Pressable accessibilityRole="button" style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>Upload InBody Report</Text>
              </Pressable>
            </Link>
            <Link asChild href="./inbody/progress">
              <Pressable accessibilityRole="button" style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>View InBody Progress</Text>
              </Pressable>
            </Link>
            <Link asChild href="./avatar">
              <Pressable accessibilityRole="button" style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Create Body Avatar</Text>
              </Pressable>
            </Link>
            <Link asChild href="./training">
              <Pressable accessibilityRole="button" style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Open Training</Text>
              </Pressable>
            </Link>
            <Link asChild href="./community">
              <Pressable accessibilityRole="button" style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Open Community</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <Text style={styles.footer}>BONYAN · DEVELOPMENT BASELINE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topline: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    backgroundColor: colors.positive,
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  statusText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  hero: {
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 58,
    letterSpacing: -3.2,
    lineHeight: 62,
  },
  eyebrow: {
    color: colors.bronze,
    fontFamily: fonts.displaySemiBold,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: spacing.xs,
  },
  intro: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 25,
    marginTop: spacing.lg,
    maxWidth: 330,
  },
  cardLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  rule: {
    backgroundColor: colors.line,
    height: 1,
    marginVertical: spacing.lg,
  },
  foundationList: {
    gap: spacing.md,
  },
  foundationRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  foundationIndex: {
    color: colors.muted,
    fontFamily: fonts.displayMedium,
    fontSize: 11,
    width: 30,
  },
  foundationName: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  foundationState: {
    color: colors.positive,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  footer: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: "auto",
    paddingTop: spacing.xl,
    textAlign: "center",
  },
  featureActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryActionText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryActionText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
