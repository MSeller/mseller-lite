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

  const toneColors: Record<StatusTone, { bg: string; fg: string }> = {
    positive: { bg: theme.colors.secondaryContainer, fg: theme.colors.onSecondaryContainer },
    pending: { bg: theme.colors.surfaceVariant, fg: theme.colors.onSurfaceVariant },
    warning: { bg: theme.colors.tertiaryContainer, fg: theme.colors.onTertiaryContainer },
    negative: { bg: theme.colors.errorContainer, fg: theme.colors.onErrorContainer },
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
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    marginVertical: 2,
  },
});

export default DocumentStatusChip;
