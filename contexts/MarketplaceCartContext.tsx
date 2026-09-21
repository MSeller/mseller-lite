import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { CarritoLinea, ProductoCatalogo } from "../types/b2b";
import { useAuth } from "./AuthContext";
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
interface CartState {
  tiendaId: string | null;
  tiendaNombre: string;
  lines: CarritoLinea[];
}

const EMPTY_CART: CartState = { tiendaId: null, tiendaNombre: "", lines: [] };

export const MarketplaceCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // UN solo objeto de estado, no tres piezas sueltas.
  //
  // Con `tiendaId`, `tiendaNombre` y `lines` por separado podían desincronizarse de dos
  // formas reales: `add` leía `tiendaId` del render, así que dos adiciones seguidas para una
  // tienda nueva usaban ambas el valor viejo y la segunda descartaba la línea de la primera;
  // y vaciar el carrito con `remove`/`setQuantity(0)` dejaba el id de la tienda anterior, de
  // modo que añadir desde otra tienda abría el diálogo de cambio sobre un carrito vacío.
  // Derivar todo del estado actual dentro del updater elimina las dos.
  const [cart, setCart] = useState<CartState>(EMPTY_CART);

  // Un carrito es de la SESIÓN, no de la app. El provider sigue montado al cerrar sesión
  // —RootLayoutContent solo cambia a AuthScreen— así que sin esto las líneas sobrevivían y
  // la siguiente cuenta que pudiera abrir la misma tienda las vería, y podría enviarlas.
  useEffect(() => {
    setCart(EMPTY_CART);
  }, [user?.uid]);

  // La tienda EFECTIVA: un carrito vacío no pertenece a ninguna.
  const tiendaId = cart.lines.length > 0 ? cart.tiendaId : null;

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

      setCart((current) => {
        // Se compara contra el estado ACTUAL del updater, no contra el del render: es lo que
        // hace correcta una segunda adición encolada antes de que React repinte.
        const mismaTienda = current.lines.length > 0 && current.tiendaId === storeId;

        // Un carrito de otra tienda no puede enviarse con este; añadir aquí significa
        // "ahora compro en esta tienda", así que la cesta anterior se va.
        const base = mismaTienda ? current.lines : [];
        const existing = base.find((line) => line.codigoProducto === producto.codigo);

        const lines = existing
          ? base.map((line) =>
              line.codigoProducto === producto.codigo
                ? { ...line, cantidad: round2(line.cantidad + cantidad) }
                : line
            )
          : [
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

        return { tiendaId: storeId, tiendaNombre: storeName, lines };
      });
    },
    []
  );

  const setQuantity = useCallback((codigoProducto: string, cantidad: number) => {
    setCart((current) => {
      // Bajar a cero elimina la línea: es lo que significa pulsar "−" hasta nada, y una
      // línea con cantidad cero la rechaza el servidor de todas formas.
      const lines =
        cantidad <= 0
          ? current.lines.filter((line) => line.codigoProducto !== codigoProducto)
          : current.lines.map((line) =>
              line.codigoProducto === codigoProducto
                ? { ...line, cantidad: round2(cantidad) }
                : line
            );

      return lines.length === 0 ? EMPTY_CART : { ...current, lines };
    });
  }, []);

  const remove = useCallback((codigoProducto: string) => {
    setCart((current) => {
      const lines = current.lines.filter((line) => line.codigoProducto !== codigoProducto);

      // Vaciar el carrito lo devuelve a "sin tienda": dejar el id puesto hacía que la
      // siguiente adición desde otra tienda preguntara si se descarta un carrito inexistente.
      return lines.length === 0 ? EMPTY_CART : { ...current, lines };
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY_CART), []);

  const quantityOf = useCallback(
    (codigoProducto: string) =>
      cart.lines.find((line) => line.codigoProducto === codigoProducto)?.cantidad ?? 0,
    [cart.lines]
  );

  const value = useMemo<MarketplaceCartValue>(() => {
    const { lines } = cart;
    const itemCount = lines.reduce((sum, line) => round2(sum + line.cantidad), 0);
    const total = lines.reduce((sum, line) => round2(sum + round2(line.cantidad * line.precio)), 0);

    return {
      tiendaId,
      tiendaNombre: cart.tiendaNombre,
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
  }, [cart, tiendaId, belongsTo, add, setQuantity, remove, quantityOf, clear]);

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
