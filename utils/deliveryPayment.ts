import type { CondicionCobro, EntregaFacturaLinea } from "../types/entrega";

/** Methods where the driver takes money; `credito` leaves the invoice on the customer's account. */
export const METODOS_COBRADOS = ["efectivo", "cheque", "transferencia", "tarjeta"];

/** What the app offered before payment conditions carried a policy. */
const METODOS_SIN_POLITICA = ["efectivo", "cheque", "transferencia", "credito"];

/** The methods to offer for a delivery, in display order. */
export const metodosDisponibles = (condicion?: CondicionCobro | null): string[] =>
  condicion ? condicion.metodosPermitidos : METODOS_SIN_POLITICA;

const redondear = (n: number) => Math.round(n * 100) / 100;

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
  if (subtotal <= 0) return redondear(total);
  const entregado = lineas.reduce(
    (sum, l) => sum + Math.max(0, l.cantidad - (faltantes[l.codigoProducto] ?? 0)) * l.precio,
    0
  );
  return redondear(total * (entregado / subtotal));
};

/** Parses a typed amount ("1,250.50" or "1250,5"); NaN when it is not a number. */
export const parseMonto = (texto: string): number => {
  const limpio = texto.trim().replace(/\s/g, "");
  if (!limpio) return NaN;
  // A single comma with no dot is a decimal comma; otherwise commas are thousand separators.
  const normal = /^\d+,\d{1,2}$/.test(limpio) ? limpio.replace(",", ".") : limpio.replace(/,/g, "");
  return /^\d*\.?\d*$/.test(normal) ? Number(normal) : NaN;
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
  if (metodo !== "efectivo") return { tipo: "exacto" };
  const recibido = parseMonto(recibidoTexto);
  if (isNaN(recibido)) return { tipo: "pendiente" };
  const r = redondear(recibido);
  if (r < adeudado) return { tipo: "insuficiente", falta: redondear(adeudado - r) };
  return { tipo: "ok", recibido: r, cambio: redondear(r - adeudado) };
};
