import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fonts, radii, spacing } from "../theme/tokens";

type AppTextFieldProps = TextInputProps & {
  error?: string;
  hint?: string;
  label: string;
};

export function AppTextField({ error, hint, label, style, ...props }: AppTextFieldProps) {
  const helpText = error ?? hint;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ disabled: props.editable === false }}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : undefined, style]}
      />
      {helpText ? (
        <Text accessibilityLiveRegion={error ? "polite" : "none"} style={error ? styles.error : styles.hint}>
          {helpText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
});
