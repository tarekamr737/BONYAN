import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppTextField, SurfaceCard } from "../../../core/components";
import { useAuthSession } from "../../../core/auth/session";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { login, register } from "../api/authApi";

export function SignInScreen() {
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (creatingAccount && password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const authenticate = creatingAccount ? register : login;
      const session = await authenticate({ email: email.trim(), password });
      await signIn(session.access_token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.wordmark}>
              BONYAN
            </Text>
            <Text style={styles.eyebrow}>BUILD HUMAN POTENTIAL</Text>
            <Text style={styles.copy}>
              Sign in to keep your reports, training, and profile private.
            </Text>
          </View>

          <SurfaceCard>
            <View style={styles.form}>
              <Text style={styles.cardLabel}>
                {creatingAccount ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
              </Text>
              <AppTextField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                textContentType="emailAddress"
                value={email}
              />
              <AppTextField
                autoCapitalize="none"
                autoComplete={creatingAccount ? "new-password" : "current-password"}
                label="Password"
                onChangeText={setPassword}
                placeholder="At least 12 characters"
                secureTextEntry
                textContentType={creatingAccount ? "newPassword" : "password"}
                value={password}
              />
              {creatingAccount ? (
                <AppTextField
                  autoCapitalize="none"
                  autoComplete="new-password"
                  label="Confirm password"
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry
                  textContentType="newPassword"
                  value={passwordConfirmation}
                />
              ) : null}
              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <AppButton
                label={creatingAccount ? "Create account" : "Sign in"}
                loading={loading}
                onPress={() => void submit()}
              />
              <AppButton
                disabled={loading}
                label={creatingAccount ? "I already have an account" : "Create an account"}
                onPress={() => {
                  setCreatingAccount((current) => !current);
                  setError(null);
                }}
                variant="secondary"
              />
              <Text style={styles.hint}>
                Your identity is verified by BONYAN. The app never sends a selectable user ID.
              </Text>
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  intro: {
    marginBottom: spacing.xl,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 52,
    letterSpacing: -2.8,
    lineHeight: 56,
  },
  eyebrow: {
    color: colors.bronze,
    fontFamily: fonts.displaySemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    marginTop: spacing.xs,
  },
  copy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  cardLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  hint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
});
