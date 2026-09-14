import React from "react";

import type { StatusTokens } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import StatusChip from "../ui/StatusChip";
import { getStatusMeta, type StatusTone } from "./documentMeta";

interface Props {
  procesado: string;
  anulado?: boolean;
  compact?: boolean;
}

/** Document tones map onto the shared status palette; "pending" is its neutral tone. */
const PALETTE_TONE: Record<StatusTone, keyof StatusTokens> = {
  positive: "positive",
  pending: "neutral",
  warning: "warning",
  negative: "negative",
};

/**
 * The processing state of a document, as a colour-coded chip.
 *
 * A voided document reads as voided regardless of the status underneath it —
 * "Procesado" on a cancelled invoice would be actively misleading.
 */
const DocumentStatusChip: React.FC<Props> = ({ procesado, anulado = false, compact = true }) => {
  const { t } = useTranslation();

  const meta = anulado
    ? { labelKey: "documents.status.anulado", tone: "negative" as StatusTone }
    : getStatusMeta(procesado);

  return <StatusChip label={t(meta.labelKey)} tone={PALETTE_TONE[meta.tone]} compact={compact} />;
};

export default DocumentStatusChip;
