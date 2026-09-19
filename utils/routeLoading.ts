import type { StatusTokens } from "../constants/Theme";
import type { CargaResponse, RutaPreparacionStatus } from "../types/preparacion";

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

/** True when a request failed with 409 and the given business `code` in the body. */
const isConflictCode = (err: unknown, code: string): boolean => {
  const response = (err as { response?: { status?: number; data?: { code?: unknown } } } | null)?.response;
  return response?.status === 409 && response.data?.code === code;
};

export const ESPERANDO_FACTURACION = "ESPERANDO_FACTURACION";

/**
 * True when a request failed because the route's invoices are not yet released to the
 * driver: 409 with `code: "ESPERANDO_FACTURACION"`. That is an expected state, not an
 * error, and screens show it as such.
 */
export const isEsperandoFacturacion = (err: unknown): boolean => isConflictCode(err, ESPERANDO_FACTURACION);

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

/**
 * Picking gating (MSE-257).
 *
 * Products may only be picked while the route is `confirmada` or `en_preparacion`. Once it
 * moves on (lista_despacho, en_ruta, …) the picking list is a read-only record, and the
 * backend answers confirmar-producto / completar with 409 PREPARACION_CERRADA.
 */
const ESTADOS_PREPARACION_ABIERTA: readonly RutaPreparacionStatus[] = ["confirmada", "en_preparacion"];

/**
 * True when the route can still be picked. A backend deployed before MSE-257 sends no
 * `status` in the consolidado; missing status keeps the old (editable) behaviour.
 */
export const preparacionAbierta = (status?: RutaPreparacionStatus | null): boolean =>
  status == null || ESTADOS_PREPARACION_ABIERTA.includes(status);

/** Statuses a route reaches only after its preparation was completed. */
const ESTADOS_PREPARADA: readonly RutaPreparacionStatus[] = ["lista_despacho", "en_ruta", "completada"];

/** True when a closed route was actually prepared (vs. cancelled or still a draft). */
export const preparacionCompletada = (status?: RutaPreparacionStatus | null): boolean =>
  status != null && ESTADOS_PREPARADA.includes(status);

export const PREPARACION_CERRADA = "PREPARACION_CERRADA";

/**
 * True when a picking write was refused because the route is no longer open for picking:
 * 409 with `code: "PREPARACION_CERRADA"`. Screens switch to read-only instead of erroring.
 */
export const esPreparacionCerrada = (err: unknown): boolean => isConflictCode(err, PREPARACION_CERRADA);
