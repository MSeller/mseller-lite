import React from "react";

import { useTranslation } from "../../hooks/useTranslation";
import type { RutaPreparacionStatus } from "../../types/preparacion";
import { routeStatusLabelKey, RUTA_STATUS_TONE } from "../../utils/routeStatus";
import StatusChip from "../ui/StatusChip";

/** A route's status as a chip: the same label and tone on every route screen. */
const RouteStatusChip: React.FC<{ status: RutaPreparacionStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return <StatusChip label={t(routeStatusLabelKey(status))} tone={RUTA_STATUS_TONE[status] ?? "neutral"} />;
};

export default RouteStatusChip;
