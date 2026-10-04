import type { StatusTokens } from "@/constants/Theme";
import type { RutaDetalleStatus } from "@/types/entrega";

// A rescheduled stop ("accent") is neither a problem nor done; a delivery with a note ("info")
// is done but must not read as a clean delivery.
export const DETALLE_STATUS: Record<RutaDetalleStatus, { tone: keyof StatusTokens; key: string }> = {
  activo: { tone: "warning", key: "entrega.detalle.pending" },
  entregado: { tone: "positive", key: "entrega.detalle.entregado" },
  entregado_con_novedad: { tone: "info", key: "entrega.detalle.entregado_con_novedad" },
  parcial: { tone: "warning", key: "entrega.detalle.parcial" },
  entregar_despues: { tone: "accent", key: "entrega.detalle.entregar_despues" },
  no_entregado: { tone: "negative", key: "entrega.detalle.no_entregado" },
  excluido: { tone: "neutral", key: "entrega.detalle.excluido" },
  reasignado: { tone: "neutral", key: "entrega.detalle.reasignado" },
};

export const detalleStatusOf = (status: RutaDetalleStatus) => DETALLE_STATUS[status] ?? DETALLE_STATUS.activo;
