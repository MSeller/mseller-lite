import type { CartLine, CartTotals } from "../types/documents";

/**
 * Formatting and money maths for the document-capture screens.
 *
 * The totals here are for DISPLAY ONLY. The server recomputes every line and the
 * document header on save (it is the authority on what the document is worth),
 * so this mirrors its calculator exactly — same order of operations, same
 * 2-decimal rounding away from zero — to avoid the form showing one number and
 * the saved document another.
 */

/** Commercial 2-decimal rounding (away from zero), matching the server. */
export const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  // toFixed rounds half away from zero for positive values; the epsilon nudge
  // keeps binary-representation cases (1.005 stored as 1.00499…) on the right side.
  const factor = 100;
  const scaled = value * factor;
  const rounded =
    scaled >= 0
      ? Math.round(scaled + Number.EPSILON * Math.abs(scaled))
      : -Math.round(-scaled + Number.EPSILON * Math.abs(scaled));
  return rounded / factor;
};

export interface LineTotals {
  subTotal: number;
  descuento: number;
  baseGravable: number;
  impuesto: number;
  total: number;
}

/** Single line total, mirroring the server's `LineaTotalCalculator`. */
export const calculateLineTotals = (line: CartLine): LineTotals => {
  const factor = line.factor > 0 ? line.factor : 1;
  const subTotal = round2(line.cantidad * factor * line.precio);
  const descuento = round2((subTotal * line.porcientoDescuento) / 100);
  const baseGravable = round2(subTotal - descuento);
  const impuesto = round2((baseGravable * line.porcientoImpuesto) / 100);
  const total = round2(baseGravable + impuesto);

  return { subTotal, descuento, baseGravable, impuesto, total };
};

/** Document totals — each line rounded first, then summed, as the server does. */
export const calculateCartTotals = (lines: CartLine[]): CartTotals =>
  lines.reduce<CartTotals>(
    (acc, line) => {
      const t = calculateLineTotals(line);
      return {
        subTotal: round2(acc.subTotal + t.subTotal),
        descuento: round2(acc.descuento + t.descuento),
        impuesto: round2(acc.impuesto + t.impuesto),
        total: round2(acc.total + t.total),
      };
    },
    { subTotal: 0, descuento: 0, impuesto: 0, total: 0 }
  );

/**
 * Money for display. Kept locale-stable (`en-US` grouping with a plain prefix)
 * rather than guessing a currency from the device: the business currency lives
 * in the tenant configuration, and showing the wrong symbol on an invoice total
 * is worse than showing none.
 */
export const formatMoney = (value: number, currency = "$"): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = Math.abs(safe)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${safe < 0 ? "-" : ""}${currency}${formatted}`;
};

/** Quantity for display — trims the decimals when the value is whole. */
export const formatQuantity = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

/**
 * The unit a line is priced in, with its packing factor when there is one:
 * `CAJA × 12`. Without it, a case of 12 reads as "1 CAJA × $145.50" next to a
 * total of $2,060 and looks like an arithmetic bug rather than a case price.
 */
export const formatUnitWithFactor = (
  unidad: string | null | undefined,
  factor: number
): string => {
  const unit = unidad?.trim() || "";
  if (!Number.isFinite(factor) || factor <= 1) return unit;
  const packed = `× ${formatQuantity(factor)}`;
  return unit ? `${unit} ${packed}` : packed;
};

/**
 * Short date (`dd/MM/yyyy`) from an ISO string; empty when unparseable.
 *
 * The calendar part is read straight off the string rather than through `Date`.
 * `new Date("2026-09-13")` is midnight UTC, so west of Greenwich `getDate()`
 * answers the 12th — a document would list under the day before it was captured.
 * The API sends the document date as a calendar date, not an instant, so it is
 * formatted as one.
 */
export const formatDateShort = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const calendario = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(iso);
  if (calendario) return `${calendario[3]}/${calendario[2]}/${calendario[1]}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

/**
 * Parses what someone typed into a numeric field. Accepts an empty string as 0
 * and tolerates a comma as the decimal separator, which is what a Spanish
 * keyboard offers.
 */
export const parseNumericInput = (raw: string): number => {
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
