import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "../../../core/components";
import { colors, fonts, spacing } from "../../../core/theme/tokens";

export function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          BONYAN
        </Text>
        <ScreenState message="Restoring your secure session." variant="loading" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 40,
    letterSpacing: -2,
    textAlign: "center",
  },
});

