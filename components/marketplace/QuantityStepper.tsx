import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, TextInput, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { formatQuantity, parseNumericInput } from "../../utils/documentFormat";

interface Props {
  value: number;
  onChange: (cantidad: number) => void;
  /** Stepping below this removes the line instead; the cart passes 0, the detail 1. */
  min?: number;
  compact?: boolean;
}

/**
 * The +/- quantity control, shared by the product detail and every cart line.
 *
 * The field holds what the user is typing rather than mirroring the prop, so a
 * half-typed number is not rewritten under them; it re-syncs whenever the committed
 * value moves on its own (stepping, or the same product added again from the grid).
 */
const QuantityStepper: React.FC<Props> = ({ value, onChange, min = 0, compact = false }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const { t } = useTranslation();

  const [text, setText] = useState(formatQuantity(value));
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setText(formatQuantity(value));
    }
  }, [value]);

  const commit = (next: number) => {
    lastCommitted.current = next;
    onChange(next);
  };

  const step = (delta: number) => {
    const next = Math.max(min, round(value + delta));
    setText(formatQuantity(next));
    commit(next);
  };

  const commitTyped = () => {
    const typed = Math.max(min, parseNumericInput(text));
    setText(formatQuantity(typed > 0 ? typed : value));
    commit(typed);
  };

  return (
    <View style={styles.row}>
      <IconButton
        icon={value <= 1 && min === 0 ? "trash-can-outline" : "minus"}
        mode="contained-tonal"
        size={compact ? 18 : 22}
        onPress={() => step(-1)}
        style={styles.button}
        accessibilityLabel={t("marketplace.decreaseQuantity")}
      />
      <TextInput
        mode="outlined"
        value={text}
        onChangeText={setText}
        onBlur={commitTyped}
        onSubmitEditing={commitTyped}
        keyboardType="decimal-pad"
        inputMode="decimal"
        dense
        style={styles.input}
        contentStyle={styles.inputContent}
        accessibilityLabel={t("marketplace.quantity")}
      />
      <IconButton
        icon="plus"
        mode="contained-tonal"
        size={compact ? 18 : 22}
        onPress={() => step(1)}
        style={styles.button}
        accessibilityLabel={t("marketplace.increaseQuantity")}
      />
    </View>
  );
};

/** Quantities are whole units or halves at most; 2 decimals is plenty. */
const round = (value: number) => Math.round(value * 100) / 100;

const createStyles = (theme: CustomTheme, compact: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    button: {
      margin: 0,
      width: compact ? 40 : 48,
      height: compact ? 40 : 48,
      borderRadius: 12,
    },
    input: {
      width: compact ? 62 : 84,
      backgroundColor: theme.colors.surface,
    },
    inputContent: {
      textAlign: "center",
      fontSize: compact ? 15 : 18,
      fontWeight: "700",
    },
  });

export default QuantityStepper;
