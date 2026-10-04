import React, { useMemo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";

interface StepperProps {
  value: string;
  onChangeText: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  accessibilityLabel: string;
  decrementLabel: string;
  incrementLabel: string;
}

/**
 * The prepared-quantity stepper: minus, the figure and plus, each on a recessed `fill` well
 * so the number reads as editable without an outlined Material field around it.
 */
const QuantityStepper: React.FC<StepperProps> = ({
  value,
  onChangeText,
  onDecrement,
  onIncrement,
  decrementDisabled = false,
  incrementDisabled = false,
  accessibilityLabel,
  decrementLabel,
  incrementLabel,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme.custom;

  const stepButton = (icon: string, onPress: () => void, disabled: boolean, label: string) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}
    >
      <Icon source={icon} size={26} color={disabled ? colors.inkTertiary : colors.tint} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {stepButton("minus", onDecrement, decrementDisabled, decrementLabel)}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={accessibilityLabel}
        style={styles.value}
        selectionColor={colors.tint}
      />
      {stepButton("plus", onIncrement, incrementDisabled, incrementLabel)}
    </View>
  );
};

interface FieldProps {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
}

/** A compact quantity field on a `fill` well, for per-row amounts. */
export const QuantityField: React.FC<FieldProps> = ({ value, onChangeText, accessibilityLabel }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      style={styles.field}
      selectionColor={theme.custom.colors.tint}
    />
  );
};

const STEP_SIZE = 56;

const createStyles = (theme: CustomTheme) => {
  const { colors, spacing, type, radius, touchTarget } = theme.custom;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    step: {
      width: STEP_SIZE,
      height: STEP_SIZE,
      borderRadius: radius.control,
      backgroundColor: colors.fill,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.7,
    },
    value: {
      ...type.figure(32),
      flex: 1,
      height: STEP_SIZE,
      paddingVertical: 0,
      textAlign: "center",
      borderRadius: radius.control,
      backgroundColor: colors.fill,
    },
    field: {
      ...type.figure(17),
      width: 88,
      minHeight: touchTarget,
      paddingVertical: 0,
      paddingHorizontal: spacing.sm,
      textAlign: "right",
      borderRadius: radius.segment,
      backgroundColor: colors.fill,
    },
  });
};

export default QuantityStepper;
