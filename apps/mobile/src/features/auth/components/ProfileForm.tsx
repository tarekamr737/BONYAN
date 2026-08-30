import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, AppTextField } from "../../../core/components";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import {
  type ProfileDraft,
  profileDraftToUpdate,
  profileToDraft,
  validateProfileDraft,
} from "../profileDraft";
import type { ProfileUpdate, UserProfile } from "../types";
import { ChoiceGroup, type ChoiceOption } from "./ChoiceGroup";

const goals = [
  { label: "Build strength", value: "strength" },
  { label: "Build muscle", value: "hypertrophy" },
  { label: "Lose fat", value: "fat_loss" },
  { label: "General fitness", value: "general_fitness" },
] as const;
const experience = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;
const days: readonly ChoiceOption<number>[] = [2, 3, 4, 5, 6].map((value) => ({
  label: `${value} days`,
  value,
}));
const equipment = [
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Dumbbells", value: "dumbbell" },
  { label: "Barbells", value: "barbell" },
  { label: "Machines", value: "machine" },
  { label: "Bands", value: "bands" },
] as const;
const languages = [
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
] as const;
const units = [
  { label: "Metric", value: "metric" },
  { label: "Imperial", value: "imperial" },
] as const;
const sexes = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Prefer not to say", value: "unspecified" },
] as const;

type ProfileFormProps = {
  error?: string | null;
  initialProfile?: UserProfile;
  loading?: boolean;
  onboardingCompleted: boolean;
  onSubmit: (update: ProfileUpdate) => void;
  submitLabel: string;
};

export function ProfileForm({
  error,
  initialProfile,
  loading = false,
  onboardingCompleted,
  onSubmit,
  submitLabel,
}: ProfileFormProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileToDraft(initialProfile));
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateDraft(update: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setValidationError(null);
  }

  function toggleEquipment(value: string) {
    const selected = draft.availableEquipment.includes(value);
    updateDraft({
      availableEquipment: selected
        ? draft.availableEquipment.filter((item) => item !== value)
        : [...draft.availableEquipment, value],
    });
  }

  function submit() {
    const message = validateProfileDraft(draft);
    if (message) {
      setValidationError(message);
      return;
    }
    onSubmit(profileDraftToUpdate(draft, onboardingCompleted));
  }

  return (
    <View style={styles.form}>
      <AppTextField
        autoCapitalize="words"
        label="Display name"
        maxLength={120}
        onChangeText={(displayName) => updateDraft({ displayName })}
        placeholder="What should we call you?"
        returnKeyType="done"
        value={draft.displayName}
      />
      <ChoiceGroup
        label="Primary goal"
        onChange={(trainingGoal) => updateDraft({ trainingGoal })}
        options={goals}
        selected={draft.trainingGoal}
      />
      <ChoiceGroup
        label="Training experience"
        onChange={(experienceLevel) => updateDraft({ experienceLevel })}
        options={experience}
        selected={draft.experienceLevel}
      />
      <ChoiceGroup
        label="Available training days"
        onChange={(availableTrainingDays) => updateDraft({ availableTrainingDays })}
        options={days}
        selected={draft.availableTrainingDays}
      />
      <ChoiceGroup
        label="Equipment access"
        multiple
        onChange={toggleEquipment}
        options={equipment}
        selected={draft.availableEquipment}
      />
      {initialProfile ? (
        <View style={styles.preferences}>
          <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
          <AppTextField
            autoCapitalize="none"
            hint="Optional · YYYY-MM-DD"
            label="Date of birth"
            onChangeText={(dateOfBirth) => updateDraft({ dateOfBirth })}
            placeholder="1995-08-24"
            value={draft.dateOfBirth}
          />
          <ChoiceGroup
            label="Sex"
            onChange={(sex) => updateDraft({ sex })}
            options={sexes}
            selected={draft.sex}
          />
          <AppTextField
            hint="Optional · centimeters"
            keyboardType="decimal-pad"
            label="Height"
            onChangeText={(heightCm) => updateDraft({ heightCm })}
            placeholder="175"
            value={draft.heightCm}
          />
        </View>
      ) : null}
      <View style={styles.preferences}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <ChoiceGroup
          label="Language"
          onChange={(preferredLanguage) => updateDraft({ preferredLanguage })}
          options={languages}
          selected={draft.preferredLanguage}
        />
        <ChoiceGroup
          label="Units"
          onChange={(preferredUnits) => updateDraft({ preferredUnits })}
          options={units}
          selected={draft.preferredUnits}
        />
      </View>
      {validationError || error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {validationError ?? error}
        </Text>
      ) : null}
      <AppButton label={submitLabel} loading={loading} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  preferences: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
});
