import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { useManualBodyMeasurements } from "../hooks";
import type { ManualBodyMeasurementsPayload } from "../types";
import { AvatarButton } from "./AvatarButton";

type ManualMeasurementsFormProps = {
  arabic?: boolean;
  onCancel?: () => void;
  onSaved: () => void;
};

type FieldKey = "height" | "weight" | "bodyFat" | "muscleMass";

const fieldDefinitions: {
  key: FieldKey;
  label: string;
  placeholder: string;
  suffix: string;
}[] = [
  { key: "height", label: "Height", placeholder: "175", suffix: "cm" },
  { key: "weight", label: "Weight", placeholder: "75", suffix: "kg" },
  { key: "bodyFat", label: "Body fat (optional)", placeholder: "24", suffix: "%" },
  { key: "muscleMass", label: "Muscle mass (optional)", placeholder: "32", suffix: "kg" },
];

function parseValue(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePayload(values: Record<FieldKey, string>, arabic = false): {
  error: string | null;
  payload: ManualBodyMeasurementsPayload | null;
} {
  const height = parseValue(values.height);
  const weight = parseValue(values.weight);
  const bodyFat = parseValue(values.bodyFat);
  const muscleMass = parseValue(values.muscleMass);

  if (height === null || height < 100 || height > 240) {
    return { error: arabic ? "اكتب طول بين 100 و240 سم." : "Enter a height between 100 and 240 cm.", payload: null };
  }
  if (weight === null || weight < 30 || weight > 350) {
    return { error: arabic ? "اكتب وزن بين 30 و350 كجم." : "Enter a weight between 30 and 350 kg.", payload: null };
  }
  if (values.bodyFat.trim() && (bodyFat === null || bodyFat < 2 || bodyFat > 70)) {
    return { error: arabic ? "نسبة الدهون لازم تكون بين 2% و70%." : "Body fat must be between 2% and 70%.", payload: null };
  }
  if (
    values.muscleMass.trim() &&
    (muscleMass === null || muscleMass < 5 || muscleMass > 150)
  ) {
    return { error: arabic ? "الكتلة العضلية لازم تكون بين 5 و150 كجم." : "Muscle mass must be between 5 and 150 kg.", payload: null };
  }
  if (muscleMass !== null && muscleMass >= weight) {
    return { error: arabic ? "الكتلة العضلية لازم تكون أقل من وزن الجسم." : "Muscle mass must be lower than body weight.", payload: null };
  }

  return {
    error: null,
    payload: {
      body_fat_percentage: bodyFat,
      height_cm: height,
      skeletal_muscle_mass_kg: muscleMass,
      weight_kg: weight,
    },
  };
}

export function ManualMeasurementsForm({ arabic = false, onCancel, onSaved }: ManualMeasurementsFormProps) {
  const mutation = useManualBodyMeasurements();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    bodyFat: "",
    height: "",
    muscleMass: "",
    weight: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateValue(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationError(null);
    mutation.reset();
  }

  function save() {
    const result = validatePayload(values, arabic);
    if (!result.payload) {
      setValidationError(result.error);
      return;
    }
    mutation.mutate(result.payload, { onSuccess: onSaved });
  }

  const error =
    validationError ??
    (mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
        ? arabic ? "ما قدرناش نحفظ القياسات. جرّب تاني." : "Manual measurements could not be saved. Try again."
        : null);

  return (
    <View style={styles.form}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{arabic ? "اكتب قياسات مؤكدة" : "Enter confirmed measurements"}</Text>
          <Text style={styles.copy}>
            {arabic ? "الطول والوزن مطلوبين. البيانات الإضافية بتخلي تقدير شكل الجسم أدق." : "Height and weight are required. More data makes the body estimate more specific."}
          </Text>
        </View>
        {onCancel ? (
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeLabel}>{arabic ? "إلغاء" : "Cancel"}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.fields}>
        {fieldDefinitions.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{fieldLabel(field.key, arabic)}</Text>
            <View style={styles.inputShell}>
              <TextInput
                accessibilityLabel={arabic ? `${fieldLabel(field.key, true)} بوحدة ${field.suffix}` : `${field.label} in ${field.suffix}`}
                inputMode="decimal"
                keyboardType="decimal-pad"
                onChangeText={(value) => updateValue(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={[styles.input, arabic && styles.inputArabic]}
                value={values[field.key]}
              />
              <Text style={styles.suffix}>{field.suffix}</Text>
            </View>
          </View>
        ))}
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.privacyNote}>
        {arabic ? "بتتستخدم بشكل خاص لحساب النسب، والقيم نفسها عمرها ما بتظهر في المجتمع." : "Used privately to calculate proportions. Raw values never appear in the community."}
      </Text>
      <AvatarButton loading={mutation.isPending} onPress={save}>
        {arabic ? "احفظ القياسات واحسب الشكل" : "Save measurements & calculate shape"}
      </AvatarButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  headingRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  copy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  closeButton: { minHeight: 44, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  closeLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  field: { flexBasis: "46%", flexGrow: 1, gap: 6, minWidth: 132 },
  label: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 11 },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minWidth: 0,
    paddingVertical: spacing.sm,
  },
  inputArabic: { textAlign: "right", writingDirection: "rtl" },
  suffix: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
  privacyNote: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
});

function fieldLabel(key: FieldKey, arabic: boolean): string {
  if (!arabic) return fieldDefinitions.find((field) => field.key === key)?.label ?? key;
  return ({ height: "الطول", weight: "الوزن", bodyFat: "دهون الجسم (اختياري)", muscleMass: "الكتلة العضلية (اختياري)" } as Record<FieldKey, string>)[key];
}
