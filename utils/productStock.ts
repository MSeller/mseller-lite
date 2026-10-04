import type { StatusTokens } from "../constants/Theme";
import type { Product } from "../types/inventory";

/**
 * Units on hand: the per-location rows when the search returned them, else the main
 * warehouse. A product just registered arrives without per-location rows, so the fallback is
 * what keeps it from reading as zero. Shared by Inventario › Productos and Catálogo › Productos.
 */
export const stockOf = (product: Product): number =>
  product.existencias?.length
    ? product.existencias.reduce((total, ex) => total + (ex.existencia ?? 0), 0)
    : (product.existenciaAlmacen1 ?? 0);

/** None, low, enough — the thresholds the catalog list and the document picker use. */
export const stockTone = (value: number): keyof StatusTokens =>
  value <= 0 ? "negative" : value <= 5 ? "warning" : "positive";
