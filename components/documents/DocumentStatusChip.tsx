import React from "react";
import { StyleSheet } from "react-native";
import { Chip, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { getStatusMeta, type StatusTone } from "./documentMeta";

interface Props {
  procesado: string;
  anulado?: boolean;
  compact?: boolean;
}

/**
 * The processing state of a document, as a colour-coded chip.
 *
 * A voided document reads as voided regardless of the status underneath it —
 * "Procesado" on a cancelled invoice would be actively misleading.
 */
const DocumentStatusChip: React.FC<Props> = ({ procesado, anulado = false, compact = true }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

  const meta = anulado
    ? { labelKey: "documents.status.anulado", tone: "negative" as StatusTone }
    : getStatusMeta(procesado);

  // Read from the dedicated status palette, not the MD3 secondary/tertiary
  // roles: those are also Paper's tonal-button and selected-chip colours, and
  // borrowing them makes an ordinary button look like a success state.
  const { status } = theme.custom;
  const toneColors: Record<StatusTone, { bg: string; fg: string }> = {
    positive: { bg: status.positive.container, fg: status.positive.onContainer },
    pending: { bg: status.neutral.container, fg: status.neutral.onContainer },
    warning: { bg: status.warning.container, fg: status.warning.onContainer },
    negative: { bg: status.negative.container, fg: status.negative.onContainer },
  };

  const colors = toneColors[meta.tone];

  return (
    <Chip
      compact={compact}
      style={[styles.chip, { backgroundColor: colors.bg }]}
      textStyle={[styles.text, { color: colors.fg }]}
    >
      {t(meta.labelKey)}
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

export default DocumentStatusChip;
