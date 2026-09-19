import type { StatusTokens } from "../constants/Theme";
import type { CargaResponse } from "../types/preparacion";

/**
 * Truck-load gating for a route in `lista_despacho` (MSE-255).
 *
 * After picking, the office generates the invoices ("Generar Facturas" →
 * `facturasGeneradas`) and then releases them to the driver ("Asignar Facturas" →
 * `facturasAsignadas`). Only then may the driver load the truck; the backend answers the
 * carga endpoints with 409 ESPERANDO_FACTURACION until that happens.
 */
export interface FacturacionFlags {
  facturasGeneradas?: boolean;
  facturasAsignadas?: boolean;
}

/**
 * True when the driver may load the truck.
 *
 * `!== false` rather than `=== true` on purpose: a backend deployed before MSE-255 sends
 * no `facturasAsignadas` at all, and treating that as "not released" would lock every
 * driver out of loading until the backend ships. Missing field → keep the old behaviour
 * (loading allowed); the new backend always sends an explicit boolean.
 */
export const cargaHabilitada = (x: FacturacionFlags | null | undefined): boolean =>
  !!x && x.facturasAsignadas !== false;

/** Where a `lista_despacho` route is in the office invoicing step. */
export type EstadoFacturacion = "esperando" | "generadas" | "asignadas";

export const estadoFacturacion = (x: FacturacionFlags): EstadoFacturacion => {
  if (cargaHabilitada(x)) return "asignadas";
  return x.facturasGeneradas ? "generadas" : "esperando";
};

/** Chip label key + tone for a `lista_despacho` route, by invoicing state. */
export const facturacionChip: Record<EstadoFacturacion, { key: string; tone: keyof StatusTokens }> = {
  esperando: { key: "routeLoading.waitingInvoicing", tone: "neutral" },
  generadas: { key: "routeLoading.invoicesGenerated", tone: "warning" },
  asignadas: { key: "routeLoading.readyToLoad", tone: "positive" },
};

export const ESPERANDO_FACTURACION = "ESPERANDO_FACTURACION";

/**
 * True when a request failed because the route's invoices are not yet released to the
 * driver: 409 with `code: "ESPERANDO_FACTURACION"`. That is an expected state, not an
 * error, and screens show it as such.
 */
export const isEsperandoFacturacion = (err: unknown): boolean => {
  const response = (err as { response?: { status?: number; data?: { code?: unknown } } } | null)?.response;
  return response?.status === 409 && response.data?.code === ESPERANDO_FACTURACION;
};

/** Read-only load status shown to the office in Preparación › Carga. */
export type FaseCarga = "esperando" | "generadas" | "asignadas" | "cargando" | "completa";

export interface ResumenCarga {
  fase: FaseCarga;
  cargados: number;
  total: number;
}

export const resumenCarga = (carga: FacturacionFlags & Pick<CargaResponse, "clientes">): ResumenCarga => {
  const clientes = carga.clientes ?? [];
  const total = clientes.length;
  const cargados = clientes.filter((c) => c.confirmado).length;
  const estado = estadoFacturacion(carga);
  if (estado !== "asignadas") return { fase: estado, cargados, total };
  if (total > 0 && cargados === total) return { fase: "completa", cargados, total };
  return { fase: cargados === 0 ? "asignadas" : "cargando", cargados, total };
};
