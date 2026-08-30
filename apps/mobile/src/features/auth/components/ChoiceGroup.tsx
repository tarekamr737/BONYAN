import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

export type ChoiceOption<T extends string | number> = {
  label: string;
  value: T;
};

type ChoiceGroupProps<T extends string | number> = {
  label: string;
  multiple?: boolean;
  onChange: (value: T) => void;
  options: readonly ChoiceOption<T>[];
  selected: T | readonly T[];
};

export function ChoiceGroup<T extends string | number>({
  label,
  multiple = false,
  onChange,
  options,
  selected,
}: ChoiceGroupProps<T>) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];

  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <Pressable
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked }}
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                checked ? styles.optionSelected : undefined,
                pressed ? styles.optionPressed : undefined,
              ]}
            >
              <Text style={checked ? styles.optionTextSelected : styles.optionText}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  option: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronze,
  },
  optionPressed: {
    opacity: 0.76,
  },
  optionText: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  optionTextSelected: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
});

