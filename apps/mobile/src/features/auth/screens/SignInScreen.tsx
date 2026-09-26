import * as Google from "expo-auth-session/providers/google";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthSession } from "../../../core/auth/session";
import { AppButton, AppTextField, BrandMark, SurfaceCard } from "../../../core/components";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { login, loginWithGoogle, register, verifyEmail } from "../api/authApi";

WebBrowser.maybeCompleteAuthSession();

export const AuthEntryPreferences = createContext<{mode: string; language: string} | null>(null);

export function SignInScreen({initialMode, initialLanguage}: {initialMode?: string; initialLanguage?: string} = {}) {
  const params = useLocalSearchParams();
  const entry = useContext(AuthEntryPreferences);
  const busy = useRef(false);
  const handledGoogleToken = useRef<string | null>(null);
  const [arabic, setArabic] = useState((entry?.language ?? params.language ?? initialLanguage) === "ar");
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState((entry?.mode ?? params.mode ?? initialMode) === "register");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleConfigured = Boolean(Platform.select({ android: googleAndroidClientId, ios: googleIosClientId, default: googleWebClientId }));
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(
    {
      androidClientId: googleAndroidClientId ?? "google-not-configured",
      iosClientId: googleIosClientId ?? "google-not-configured",
      webClientId: googleWebClientId ?? "google-not-configured",
      selectAccount: true,
    },
    { scheme: "bonyan" },
  );

  useEffect(() => {
    const idToken = googleResponse?.type === "success" ? googleResponse.params.id_token : undefined;
    if (!idToken || handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;
    setLoading(true);
    setError(null);
    void loginWithGoogle(idToken)
      .then((session) => signIn(session.access_token))
      .catch((caught) => setError(messageFor(caught, arabic)))
      .finally(() => setLoading(false));
  }, [arabic, googleResponse, signIn]);

  async function submitCredentials() {
    if (busy.current) return;
    setError(null);
    if (!email.trim()) return setError(arabic ? "اكتب بريدك الإلكتروني." : "Enter your email address.");
    if (password.length < 12) return setError(arabic ? "كلمة المرور لازم تكون ١٢ حرف على الأقل." : "Password must be at least 12 characters.");
    if (creatingAccount && password !== passwordConfirmation) return setError(arabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
    busy.current = true;
    setLoading(true);
    try {
      if (creatingAccount) {
        const started = await register({ email: email.trim(), password });
        setChallengeId(started.challenge_id);
        setCode("");
      } else {
        const session = await login({ email: email.trim(), password });
        await signIn(session.access_token);
      }
    } catch (caught) {
      setError(messageFor(caught, arabic));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function confirmCode() {
    if (!challengeId || busy.current) return;
    if (!/^\d{6}$/.test(code)) return setError(arabic ? "اكتب الكود المكوّن من ٦ أرقام." : "Enter the 6-digit code.");
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const session = await verifyEmail(challengeId, code);
      await signIn(session.access_token);
    } catch (caught) {
      setError(messageFor(caught, arabic));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function resendCode() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const started = await register({ email: email.trim(), password });
      setChallengeId(started.challenge_id);
      setCode("");
    } catch (caught) {
      setError(messageFor(caught, arabic));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  function switchMode() {
    setCreatingAccount((current) => !current);
    setChallengeId(null);
    setCode("");
    setError(null);
  }

  return (
    <LanguageDirection.Provider value={arabic}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.intro}>
              <AppButton variant="secondary" label={arabic ? "English" : "العربية"} onPress={() => setArabic(!arabic)} />
              <BrandMark size={176} />
              <Text style={styles.eyebrow}>{arabic ? "لياقة بدنية وتدريب احترافي" : "PREMIUM FITNESS & TRAINING"}</Text>
            </View>
            <SurfaceCard>
              <View style={styles.form}>
                <Text style={styles.cardLabel}>{challengeId ? (arabic ? "تأكيد البريد" : "VERIFY YOUR EMAIL") : creatingAccount ? (arabic ? "إنشاء حسابك" : "CREATE YOUR ACCOUNT") : (arabic ? "أهلًا بعودتك" : "WELCOME BACK")}</Text>
                {challengeId ? (
                  <>
                    <Text style={styles.hint}>{arabic ? `بعتنا كود مؤقت من ٦ أرقام إلى ${email}.` : `We sent a temporary 6-digit code to ${email}.`}</Text>
                    <AppTextField autoComplete="one-time-code" keyboardType="number-pad" label={arabic ? "كود التأكيد" : "Verification code"} maxLength={6} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} textContentType="oneTimeCode" value={code} />
                    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                    <AppButton label={arabic ? "تأكيد وإنشاء الحساب" : "Verify and create account"} loading={loading} onPress={() => void confirmCode()} />
                    <AppButton variant="secondary" disabled={loading} label={arabic ? "إرسال كود جديد" : "Send a new code"} onPress={() => void resendCode()} />
                    <AppButton variant="secondary" disabled={loading} label={arabic ? "تعديل البريد" : "Change email"} onPress={() => { setChallengeId(null); setCode(""); setError(null); }} />
                  </>
                ) : (
                  <>
                    {googleConfigured ? <AppButton variant="secondary" disabled={!googleRequest || loading} label={arabic ? "المتابعة باستخدام Google" : "Continue with Google"} onPress={() => void promptGoogle()} /> : null}
                    {googleConfigured ? <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{arabic ? "أو" : "OR"}</Text><View style={styles.line} /></View> : null}
                    <AppTextField autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" label={arabic ? "البريد الإلكتروني" : "Email"} onChangeText={setEmail} placeholder="you@example.com" textContentType="emailAddress" value={email} />
                    <AppTextField autoCapitalize="none" autoComplete={creatingAccount ? "new-password" : "current-password"} label={arabic ? "كلمة المرور" : "Password"} onChangeText={setPassword} placeholder={arabic ? "١٢ حرف على الأقل" : "At least 12 characters"} secureTextEntry textContentType={creatingAccount ? "newPassword" : "password"} value={password} />
                    {creatingAccount ? <AppTextField autoCapitalize="none" autoComplete="new-password" label={arabic ? "تأكيد كلمة المرور" : "Confirm password"} onChangeText={setPasswordConfirmation} secureTextEntry textContentType="newPassword" value={passwordConfirmation} /> : null}
                    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                    <AppButton label={creatingAccount ? (arabic ? "إرسال كود التأكيد" : "Send verification code") : (arabic ? "تسجيل الدخول" : "Sign in")} loading={loading} onPress={() => void submitCredentials()} />
                    <AppButton disabled={loading} label={creatingAccount ? (arabic ? "لدي حساب بالفعل" : "I already have an account") : (arabic ? "إنشاء حساب جديد" : "Create an account")} onPress={switchMode} variant="secondary" />
                  </>
                )}
                <Text style={styles.hint}>{arabic ? "تمريناتك وقياساتك خاصة بيك." : "Your training and measurements stay private."}</Text>
              </View>
            </SurfaceCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LanguageDirection.Provider>
  );
}

function messageFor(caught: unknown, arabic: boolean): string {
  if (!arabic && caught instanceof Error) return caught.message;
  const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : "";
  if (arabic && code === "invalid_verification_code") return "الكود غير صحيح. راجعه وحاول تاني.";
  if (arabic && code === "verification_expired") return "انتهت صلاحية الكود. اطلب كود جديد.";
  if (arabic && code === "account_exists") return "البريد ده مسجل بالفعل. جرّب تسجيل الدخول.";
  if (arabic && code === "email_unavailable") return "تعذر إرسال الإيميل الآن. حاول مرة تانية.";
  return arabic ? "حصلت مشكلة. راجع البيانات والاتصال وحاول مرة تانية." : "Something went wrong. Try again.";
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 }, keyboardView: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg }, intro: { gap: spacing.sm, marginBottom: spacing.xl },
  eyebrow: { color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 11, letterSpacing: 2.6 }, form: { gap: spacing.md },
  cardLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.6 },
  hint: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20 },
  divider: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, line: { backgroundColor: colors.line, flex: 1, height: 1 },
  or: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 10 },
});
