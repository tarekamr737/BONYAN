import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { sendCoachMessage } from "../api/trainingApi";
import { TrainingHeader } from "../components/TrainingHeader";

const prompts = ["Explain today's plan", "Find a swap", "Why hold this weight?"];

export function CoachScreen() {
  const [message, setMessage] = useState("Explain today's workout plan");
  const [reply, setReply] = useState<string | null>(null);
  const [model, setModel] = useState("TBD");
  const [toolCount, setToolCount] = useState(0);

  const sendMutation = useMutation({
    mutationFn: () => sendCoachMessage(message, [{ name: "get_current_plan" }]),
    onSuccess: (response) => {
      setReply(response.response);
      setModel(response.model);
      setToolCount(response.tool_results.length);
    },
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TrainingHeader
          title="Coach"
          subtitle="Ask about training, plan context, swaps, and logging while deterministic BONYAN tools handle state."
        />

        <SurfaceCard>
          <Text style={styles.coachLabel}>MOCK MODEL / {model}</Text>
          <Text style={styles.coachText}>
            {reply ??
              "I can explain your active plan, search exercises, or log workout details through validated tools."}
          </Text>
          {toolCount > 0 ? <Text style={styles.toolText}>{toolCount} tool result loaded</Text> : null}
        </SurfaceCard>

        {sendMutation.isError ? (
          <SurfaceCard>
            <Text style={styles.errorTitle}>Coach unavailable</Text>
            <Text style={styles.errorText}>The coach could not respond. Check the message and retry.</Text>
          </SurfaceCard>
        ) : null}

        <View style={styles.promptRow}>
          {prompts.map((prompt) => (
            <Pressable
              accessibilityRole="button"
              key={prompt}
              onPress={() => setMessage(prompt)}
              style={styles.prompt}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel="Coach message"
            multiline
            onChangeText={setMessage}
            placeholder="Ask about your training"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={message}
          />
          <Pressable
            accessibilityRole="button"
            disabled={sendMutation.isPending || !message.trim()}
            onPress={() => sendMutation.mutate()}
            style={[styles.sendButton, (sendMutation.isPending || !message.trim()) && styles.disabledAction]}
          >
            <Text style={styles.sendButtonText}>{sendMutation.isPending ? "Sending..." : "Send"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  coachLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  coachText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabledAction: {
    opacity: 0.55,
  },
  errorText: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  errorTitle: {
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrap: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.xs,
  },
  prompt: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  promptText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  sendButtonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  toolText: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: spacing.md,
  },
});
