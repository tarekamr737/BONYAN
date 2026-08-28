import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

type SetStepperProps = {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function SetStepper({ label, value, step, min, max, onChange }: SetStepperProps) {
  const decrease = () => onChange(Math.max(min, Number((value - step).toFixed(1))));
  const increase = () => onChange(Math.min(max, Number((value + step).toFixed(1))));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.control}>
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
          onPress={decrease}
          style={styles.button}
        >
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
          onPress={increase}
          style={styles.button}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    height: 50,
    justifyContent: "center",
    width: 54,
  },
  buttonText: {
    color: colors.canvas,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  control: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  label: {
    color: colors.mutedLight,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  value: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    minWidth: 54,
    textAlign: "center",
  },
  wrapper: {
    flex: 1,
    gap: spacing.xs,
  },
});
