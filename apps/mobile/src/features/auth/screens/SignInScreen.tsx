import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { createContext, useContext, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppTextField, SurfaceCard } from "../../../core/components";
import { useAuthSession } from "../../../core/auth/session";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { login, register } from "../api/authApi";

import { useLocalSearchParams } from "expo-router";

export const AuthEntryPreferences = createContext<{mode: string; language: string} | null>(null);

export function SignInScreen({initialMode, initialLanguage}: {initialMode?: string; initialLanguage?: string} = {}) {
  const params = useLocalSearchParams();
  const entry = useContext(AuthEntryPreferences);
  const busy = useRef(false);
  const [arabic, setArabic] = useState((entry?.language ?? params.language ?? initialLanguage) === "ar");
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [creatingAccount, setCreatingAccount] = useState((entry?.mode ?? params.mode ?? initialMode) === "register");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (busy.current) return;
    setError(null);
    if (!email.trim()) {
      setError(arabic ? "اكتب بريدك الإلكتروني." : "Enter your email address.");
      return;
    }
    if (password.length < 12) {
      setError(arabic ? "كلمة المرور لازم تكون ١٢ حرف على الأقل." : "Password must be at least 12 characters.");
      return;
    }
    if (creatingAccount && password !== passwordConfirmation) {
      setError(arabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const authenticate = creatingAccount ? register : login;
      const session = await authenticate({ email: email.trim(), password });
      await signIn(session.access_token);
    } catch (caught) {
      setError(arabic ? "تعذر تسجيل الدخول. راجع بياناتك واتصالك وحاول مرة أخرى." : caught instanceof Error ? caught.message : "Sign-in failed. Try again.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <LanguageDirection.Provider value={arabic}><SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}><AppButton variant="secondary" label={arabic ? "English" : "العربية"} onPress={() => setArabic(!arabic)} />
            <Text accessibilityRole="header" style={styles.wordmark}>
              BONYAN
            </Text>
            <Text style={styles.eyebrow}>{arabic ? "تأهيل بدني عسكري + جيم" : "MILITARY PREPARATION + GYM"}</Text>
            <Text style={styles.copy}>
              {arabic ? "ابنِ روتين تدريبك وتابع تمريناتك وتقدمك في مكان واحد." : "Build your training routine. Keep your workouts and progress together."}
            </Text>
          </View>

          <SurfaceCard>
            <View style={styles.form}>
              <Text style={styles.cardLabel}>
                {creatingAccount ? arabic ? "إنشاء حسابك" : "CREATE YOUR ACCOUNT" : arabic ? "أهلًا بعودتك" : "WELCOME BACK"}
              </Text>
              <AppTextField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                label={arabic ? "البريد الإلكتروني" : "Email"}
                onChangeText={setEmail}
                placeholder="you@example.com"
                textContentType="emailAddress"
                value={email}
              />
              <AppTextField
                autoCapitalize="none"
                autoComplete={creatingAccount ? "new-password" : "current-password"}
                clearTextOnFocus={false}
                label={arabic ? "كلمة المرور" : "Password"}
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
                  clearTextOnFocus={false}
                  label={arabic ? "تأكيد كلمة المرور" : "Confirm password"}
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
                label={creatingAccount ? arabic ? "إنشاء حساب" : "Create account" : arabic ? "تسجيل الدخول" : "Sign in"}
                loading={loading}
                onPress={() => void submit()}
              />
              <AppButton
                disabled={loading}
                label={creatingAccount ? arabic ? "لدي حساب بالفعل" : "I already have an account" : arabic ? "إنشاء حساب جديد" : "Create an account"}
                onPress={() => {
                  setCreatingAccount((current) => !current);
                  setError(null);
                }}
                variant="secondary"
              />
              <Text style={styles.hint}>
                {arabic ? "تمريناتك وقياساتك خاصة بيك." : "Your training and measurements stay private."}
              </Text>
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView></LanguageDirection.Provider>
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
