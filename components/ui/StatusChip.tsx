import React from "react";
import { StyleSheet } from "react-native";
import { Chip, useTheme } from "react-native-paper";

import type { CustomTheme, StatusTokens } from "../../constants/Theme";

interface Props {
  label: string;
  tone: keyof StatusTokens;
  compact?: boolean;
}

/**
 * A state as a colour-coded chip — a document's processing status, a catalog record's
 * Activo/Inactivo.
 *
 * Reads from the dedicated status palette, not the MD3 secondary/tertiary roles: those
 * are also Paper's tonal-button and selected-chip colours, and borrowing them makes an
 * ordinary button look like a success state.
 */
const StatusChip: React.FC<Props> = ({ label, tone, compact = true }) => {
  const theme = useTheme() as CustomTheme;
  const colors = theme.custom.status[tone];

  return (
    <Chip
      compact={compact}
      style={[styles.chip, { backgroundColor: colors.container }]}
      textStyle={[styles.text, { color: colors.onContainer }]}
    >
      {label}
    </Chip>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    // The chip's own hairline would double up with the tint; the fill is enough.
    borderWidth: 0,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    marginVertical: 2,
  },
});

export default StatusChip;
