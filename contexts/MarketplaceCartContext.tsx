import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { CarritoLinea, ProductoCatalogo } from "../types/b2b";
import { round2 } from "../utils/documentFormat";

interface MarketplaceCartValue {
  /** The store the cart belongs to; `null` when it is empty. */
  tiendaId: string | null;
  tiendaNombre: string;
  lines: CarritoLinea[];
  /** Units in the cart — the badge on the cart button. */
  itemCount: number;
  /** Running total at catalogue prices. The server prices the request when it lands. */
  total: number;
  isEmpty: boolean;
  /** True when the cart is empty or already belongs to this store. */
  belongsTo: (tiendaId: string) => boolean;
  /** Adds (or bumps) a line. Adding from another store replaces the cart. */
  add: (
    tiendaId: string,
    tiendaNombre: string,
    producto: ProductoCatalogo,
    cantidad?: number
  ) => void;
  setQuantity: (codigoProducto: string, cantidad: number) => void;
  remove: (codigoProducto: string) => void;
  /** How many of this product are already in the cart. */
  quantityOf: (codigoProducto: string) => number;
  clear: () => void;
}

const MarketplaceCartContext = createContext<MarketplaceCartValue | undefined>(undefined);

/**
 * The buyer's marketplace cart.
 *
 * One cart, one store: a purchase request goes to a single supplier, so adding a product
 * from a different store replaces what was there rather than building a basket that
 * cannot be sent. The catalogue screen warns before that happens.
 *
 * Deliberately in memory only. A cart priced from a catalogue read minutes ago is worth
 * less than it looks — prices and availability move — and the supplier confirms
 * quantities anyway, so there is nothing here worth restoring after the app is closed.
 *
 * The totals are a preview: the server prices the request and its answer is what the
 * supplier sees.
 */
export const MarketplaceCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [tiendaNombre, setTiendaNombre] = useState("");
  const [lines, setLines] = useState<CarritoLinea[]>([]);

  const belongsTo = useCallback(
    (candidate: string) => tiendaId === null || tiendaId === candidate,
    [tiendaId]
  );

  const add = useCallback(
    (
      storeId: string,
      storeName: string,
      producto: ProductoCatalogo,
      cantidad = 1
    ) => {
      if (cantidad <= 0) return;

      setTiendaId(storeId);
      setTiendaNombre(storeName);
      setLines((current) => {
        // A cart from another store cannot be sent with this one; adding here means
        // "shop at this store now", so the previous basket goes.
        const base = tiendaId === storeId ? current : [];
        const existing = base.find((line) => line.codigoProducto === producto.codigo);
        if (existing) {
          return base.map((line) =>
            line.codigoProducto === producto.codigo
              ? { ...line, cantidad: round2(line.cantidad + cantidad) }
              : line
          );
        }

        return [
          ...base,
          {
            codigoProducto: producto.codigo,
            descripcion: producto.nombre || producto.codigo,
            cantidad,
            precio: producto.precio,
            unidad: producto.unidad,
            imagenUrl: producto.imagenUrl,
            disponible: producto.disponible,
          },
        ];
      });
    },
    [tiendaId]
  );

  const setQuantity = useCallback((codigoProducto: string, cantidad: number) => {
    setLines((current) => {
      // Down to zero removes the line: it is what stepping "−" to nothing means, and a
      // zero-quantity line is rejected server-side anyway.
      const next =
        cantidad <= 0
          ? current.filter((line) => line.codigoProducto !== codigoProducto)
          : current.map((line) =>
              line.codigoProducto === codigoProducto
                ? { ...line, cantidad: round2(cantidad) }
                : line
            );
      return next;
    });
  }, []);

  const remove = useCallback((codigoProducto: string) => {
    setLines((current) => current.filter((line) => line.codigoProducto !== codigoProducto));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setTiendaId(null);
    setTiendaNombre("");
  }, []);

  const quantityOf = useCallback(
    (codigoProducto: string) =>
      lines.find((line) => line.codigoProducto === codigoProducto)?.cantidad ?? 0,
    [lines]
  );

  const value = useMemo<MarketplaceCartValue>(() => {
    const itemCount = lines.reduce((sum, line) => round2(sum + line.cantidad), 0);
    const total = lines.reduce((sum, line) => round2(sum + round2(line.cantidad * line.precio)), 0);

    return {
      tiendaId: lines.length > 0 ? tiendaId : null,
      tiendaNombre,
      lines,
      itemCount,
      total,
      isEmpty: lines.length === 0,
      belongsTo,
      add,
      setQuantity,
      remove,
      quantityOf,
      clear,
    };
  }, [lines, tiendaId, tiendaNombre, belongsTo, add, setQuantity, remove, quantityOf, clear]);

  return (
    <MarketplaceCartContext.Provider value={value}>{children}</MarketplaceCartContext.Provider>
  );
};

export const useMarketplaceCart = (): MarketplaceCartValue => {
  const context = useContext(MarketplaceCartContext);
  if (!context) {
    throw new Error("useMarketplaceCart must be used within a MarketplaceCartProvider");
  }
  return context;
};
