import { useCallback, useMemo, useState } from "react";
import type { CartLine, CartTotals, CreateDocumentItem } from "../types/documents";
import type { Product } from "../types/inventory";
import { calculateCartTotals, round2 } from "../utils/documentFormat";

let lineCounter = 0;
const nextKey = () => `line-${Date.now()}-${lineCounter++}`;

/**
 * The lines being captured for a document, plus the totals shown while capturing.
 *
 * Two deliberate choices:
 * - Adding a product that is already in the cart BUMPS its quantity instead of
 *   appending a duplicate row. Tapping the same item twice in a picker means
 *   "two of these", not "two lines of one".
 * - The totals are a preview. The server recomputes them on save and its answer
 *   is what the document is worth; `utils/documentFormat` mirrors its calculator
 *   so the two agree.
 */
export const useDocumentCart = () => {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addProduct = useCallback((product: Product, cantidad = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.codigoProducto === product.codigo);
      if (existing) {
        return current.map((l) =>
          l.key === existing.key ? { ...l, cantidad: round2(l.cantidad + cantidad) } : l
        );
      }

      return [
        ...current,
        {
          key: nextKey(),
          codigoProducto: product.codigo,
          descripcion: product.nombre || product.codigo,
          unidad: product.unidad ?? null,
          cantidad,
          precio: product.precio1 ?? 0,
          precioLista: product.precio1 ?? 0,
          factor: product.factor > 0 ? product.factor : 1,
          porcientoImpuesto: product.impuesto ?? 0,
          porcientoDescuento: 0,
          existencia: product.existenciaAlmacen1 ?? 0,
        },
      ];
    });
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<CartLine>) => {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const setQuantity = useCallback(
    (key: string, cantidad: number) => {
      // Dropping to zero removes the line: it is the natural result of tapping
      // "−" down to nothing, and a zero-quantity line is rejected server-side.
      if (cantidad <= 0) {
        setLines((current) => current.filter((l) => l.key !== key));
        return;
      }
      updateLine(key, { cantidad: round2(cantidad) });
    },
    [updateLine]
  );

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totals: CartTotals = useMemo(() => calculateCartTotals(lines), [lines]);

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => round2(sum + l.cantidad), 0),
    [lines]
  );

  /**
   * The cart as the API's line payload. The price is sent only when it differs
   * from the product's list price — otherwise the server applies the current
   * catalogue price, which is the right answer if the catalogue changed between
   * opening the form and saving.
   */
  const toRequestItems = useCallback(
    (): CreateDocumentItem[] =>
      lines.map((l) => ({
        codigoProducto: l.codigoProducto,
        cantidad: l.cantidad,
        ...(l.precio !== l.precioLista ? { precio: l.precio } : {}),
        factor: l.factor,
        ...(l.porcientoDescuento > 0 ? { porcientoDescuento: l.porcientoDescuento } : {}),
      })),
    [lines]
  );

  return {
    lines,
    totals,
    itemCount,
    isEmpty: lines.length === 0,
    addProduct,
    updateLine,
    setQuantity,
    removeLine,
    clear,
    toRequestItems,
  };
};
