import type { CondicionCobro, EntregaFacturaLinea } from "../types/entrega";
import { parseStrictNumericInput, round2 } from "./documentFormat";

/**
 * Payment methods a driver records on a delivery, as the API names them (`MetodoCobro` in
 * mseller-api). `credito` means left on the customer's account, not a credit card.
 * Labels live in the locale files as `entrega.pay_<method>`.
 */
export const METODOS_COBRO = ["efectivo", "cheque", "transferencia", "tarjeta", "credito"] as const;
export type MetodoCobro = (typeof METODOS_COBRO)[number];

export const EFECTIVO: MetodoCobro = "efectivo";

/** Whether the driver takes money with this method (everything but leaving it on account). */
export const loCobraElChofer = (metodo: string): boolean =>
  metodo !== "credito" && (METODOS_COBRO as readonly string[]).includes(metodo);

/** What the app offered before payment conditions carried a policy. */
const METODOS_SIN_POLITICA: MetodoCobro[] = ["efectivo", "cheque", "transferencia", "credito"];

/** The methods to offer for a delivery, in display order. */
export const metodosDisponibles = (condicion?: CondicionCobro | null): string[] =>
  condicion ? condicion.metodosPermitidos : METODOS_SIN_POLITICA;

/** The method preselected when the payment dialog opens: cash when allowed. */
export const metodoInicial = (metodos: string[]): string =>
  metodos.includes(EFECTIVO) ? EFECTIVO : (metodos[0] ?? "");

/**
 * The amount due for this delivery: the invoice total, or on a partial delivery the share of it
 * that was delivered — the delivered part of the line subtotals, applied to the total so tax is
 * charged in the same proportion.
 */
export const montoAdeudado = (
  total: number,
  lineas: EntregaFacturaLinea[],
  faltantes: Record<string, number> = {}
): number => {
  const subtotal = lineas.reduce((sum, l) => sum + l.cantidad * l.precio, 0);
  if (subtotal <= 0) return round2(total);
  const entregado = lineas.reduce(
    (sum, l) => sum + Math.max(0, l.cantidad - (faltantes[l.codigoProducto] ?? 0)) * l.precio,
    0
  );
  return round2(total * (entregado / subtotal));
};

export type EstadoCobro =
  /** Nothing to enter: a non-cash method collects exactly what is due, or it is left on credit. */
  | { tipo: "exacto" }
  /** Cash not entered yet, or not a number. */
  | { tipo: "pendiente" }
  /** Cash short of the amount due — the delivery cannot be confirmed. */
  | { tipo: "insuficiente"; falta: number }
  | { tipo: "ok"; recibido: number; cambio: number };

/** For cash: the change to return, or how much is missing. Other methods need no amount. */
export const estadoCobro = (metodo: string, adeudado: number, recibidoTexto: string): EstadoCobro => {
  if (metodo !== EFECTIVO) return { tipo: "exacto" };
  // An empty field is "not entered yet", not zero.
  const recibido = recibidoTexto.trim() ? parseStrictNumericInput(recibidoTexto) : null;
  if (recibido === null) return { tipo: "pendiente" };
  const r = round2(recibido);
  if (r < adeudado) return { tipo: "insuficiente", falta: round2(adeudado - r) };
  return { tipo: "ok", recibido: r, cambio: round2(r - adeudado) };
};

/** A COD delivery needs a method, and cash must cover what is due — short cash is not delivered. */
export const puedeConfirmarCobro = (
  condicion: CondicionCobro | null | undefined,
  metodo: string,
  estado: EstadoCobro
): boolean => (!condicion?.contraEntrega || !!metodo) && (metodo !== EFECTIVO || estado.tipo === "ok");
