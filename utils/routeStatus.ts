import type { StatusTokens } from "../constants/Theme";
import type { RutaPreparacionStatus } from "../types/preparacion";

/**
 * Chip tone for a route's status, shared by the picking and delivery route lists so a route
 * reads the same colour on both. Seven statuses over six tones: the two warehouse steps
 * (en preparación, lista para despacho) share amber and their label tells them apart, while
 * "en ruta" and "completada" stay distinct because that is the difference a driver scans for.
 */
export const RUTA_STATUS_TONE: Record<RutaPreparacionStatus, keyof StatusTokens> = {
  borrador: "neutral",
  confirmada: "info",
  en_preparacion: "warning",
  lista_despacho: "warning",
  en_ruta: "accent",
  completada: "positive",
  cancelada: "negative",
};
