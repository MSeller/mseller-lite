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

/** Locale key for a route status label, the one wording every route screen uses. */
export const routeStatusLabelKey = (status: RutaPreparacionStatus): string => `entrega.status.${status}`;

/**
 * Why a route module could not load, on its list or on the home card. `disabled` is the API's
 * 403 — the module is switched off for this user (the delivery feature flag) — and
 * `unassigned` its 400 for a user with no driver code. Neither is fixed by trying again, so each gets its own explanation instead of
 * the server's raw message and a retry.
 */
export interface RouteListFailure {
  kind: "disabled" | "unassigned" | "failed";
  message: string;
}

export const describeRouteListError = (
  err: any,
  fallback: string,
  /** Only the delivery endpoint answers 400 for a user without a driver code. */
  { unassignedOn400 = false }: { unassignedOn400?: boolean } = {}
): RouteListFailure => {
  const status = err?.response?.status;
  const message = err?.response?.data?.message || err?.message || fallback;
  if (status === 403) return { kind: "disabled", message };
  if (status === 400 && unassignedOn400) return { kind: "unassigned", message };
  return { kind: "failed", message };
};
