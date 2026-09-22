import type { PagedResult } from "./documents";

/**
 * Marketplace B2B — the buyer's side.
 *
 * A colmado signs up, gets its own tenant, and from here browses the directory of
 * supplier stores (*tiendas*), links itself to one (*vínculo*) with the code its sales
 * rep handed over, browses that store's catalogue and sends a purchase request
 * (*solicitud*) the rep turns into a real order.
 *
 * Mirrors the Consumo API contract under `/consumo/b2b`. A store is ALWAYS identified by
 * `tiendaId`, a GUID — the API never exposes a supplier `businessId` and never accepts one.
 *
 * Enums travel as strings, and errors follow the house shape (`{ message }` in Spanish).
 */

export type { PagedResult };

// ── Directory and links ─────────────────────────────────────────────────────

/** State of the commercial link between this buyer and a store. */
export type EstadoVinculo = "pendiente" | "activa" | "bloqueada" | "rechazada";

/** A supplier store as it appears in the directory. */
export interface TiendaMarketplace {
  /** GUID — this is the `tiendaId` every other call takes. */
  id: string;
  nombre: string;
  descripcion?: string;
  /** Short tagline shown on the store's card, next to the name. */
  eslogan?: string;
  logoUrl?: string;
  categoria?: string;
  minimoPedido?: number;
  /** `null`/absent means this buyer has no link with the store yet. */
  estadoVinculo?: EstadoVinculo | null;
  /**
   * Whether a buyer with no active link can browse this store's catalog. `true` is the
   * "open" mode: the catalog is visible before linking. `false` is "restricted": the app
   * should go straight to "redeem a code" / "request access" instead of opening a catalog
   * that would just 404. A buyer with an ACTIVE link can always browse, regardless of this.
   *
   * Optional, not just nullable: the paired backend field can still be absent from a
   * response (rollout ordering, a cached/legacy payload). Missing must read as "open" —
   * the backend's own default — never as restricted, so callers check
   * `permiteExploracionSinVinculo !== false`, not truthiness.
   */
  permiteExploracionSinVinculo?: boolean;
}

export interface VinculoB2B {
  id: string;
  tiendaId: string;
  tiendaNombre: string;
  tiendaLogoUrl?: string;
  estado: EstadoVinculo;
  creadoEn: string;
  activadoEn?: string;
}

/** `POST /consumo/b2b/vinculos/redimir` — the code the store's rep handed over. */
export interface RedimirCodigoRequest {
  codigo: string;
}

/** `POST /consumo/b2b/vinculos/solicitar` — asking a store for access. */
export interface SolicitarVinculoRequest {
  tiendaId: string;
  nombreNegocio: string;
  rnc?: string;
  telefono?: string;
  direccion?: string;
}

// ── Catalogue ───────────────────────────────────────────────────────────────

/**
 * A catalogue row. One price, already resolved server-side for this buyer — when the
 * buyer isn't linked to the store yet, this is still visible: browsing a published
 * store's catalogue never requires a code or a pending request, only PLACING an order
 * does (see `tieneVinculoActivo`).
 */
export interface ProductoCatalogo {
  codigo: string;
  nombre?: string;
  descripcion?: string;
  area?: string;
  unidad?: string;
  empaque?: string;
  factor: number;
  impuesto: number;
  promocion: boolean;
  /** `null` when `precioOculto` is `true` — not a product with no price loaded. */
  precio: number | null;
  /**
   * `true` means the store (or this buyer's own link) chose not to reveal price/total
   * until a request is accepted. Render "Price shown after your order is placed"
   * instead of a blank amount or RD$0.00.
   */
  precioOculto: boolean;
  /** Coarse in/out of stock. NEVER a quantity — the store does not publish its stock. */
  disponible: boolean;
  /** Thumbnail for the grid. */
  imagenUrl?: string;
  /**
   * Whether this buyer has an ACTIVE link with the store. The catalogue can be explored
   * without one, but sending a purchase request still needs it — screens use this flag
   * to show "redeem a code" / "request access" instead of the add-to-cart action.
   */
  tieneVinculoActivo: boolean;
}

/** The same product with its full gallery; the list may be empty or hold a single image. */
export interface ProductoCatalogoDetalle extends ProductoCatalogo {
  imagenes: string[];
}

/** `GET /consumo/b2b/tiendas/{tiendaId}/vendedor`, when the store shares it (204 otherwise). */
export interface VendedorContacto {
  codigo?: string;
  nombre?: string;
  telefono?: string;
}

// ── Purchase requests ───────────────────────────────────────────────────────

export type EstadoSolicitud = "enviada" | "aceptada" | "rechazada" | "cancelada";

export interface SolicitudLinea {
  id: number;
  codigoProducto: string;
  descripcion?: string;
  /** What the buyer asked for. */
  cantidadSolicitada: number;
  /** What the supplier confirmed — may be lower, or zero. */
  cantidadConfirmada: number;
  /** `null` while `SolicitudB2B.precioOculto` is `true` and the request is still pending. */
  precio: number | null;
  importe: number | null;
  unidad?: string;
}

export interface SolicitudB2B {
  id: string;
  /** e.g. `SOL-000123`. Shown to the buyer as soon as the request lands. */
  noSolicitud: string;
  tiendaId: string;
  tiendaNombre: string;
  estado: EstadoSolicitud;
  /**
   * `null` while `precioOculto` is `true` and the request hasn't been accepted yet —
   * shown as soon as it is, since the real order exists by then anyway.
   */
  total: number | null;
  /** `true` when this store/link hides price from the buyer until the order is placed. */
  precioOculto: boolean;
  comentario?: string;
  /** The supplier's real order number, once the request is accepted. */
  noPedidoStr?: string;
  razonRechazo?: string;
  creadoEn: string;
  resueltaEn?: string;
  lineas: SolicitudLinea[];
}

export interface CrearSolicitudLinea {
  codigoProducto: string;
  cantidad: number;
}

/** `POST /consumo/b2b/solicitudes`. */
export interface CrearSolicitudRequest {
  tiendaId: string;
  lineas: CrearSolicitudLinea[];
  comentario?: string;
  /**
   * Client-generated UUID. The server returns the SAME request for a repeated key, so a
   * double tap or a retry after a timeout cannot create two purchase requests.
   */
  idempotencyKey?: string;
}

// ── Query parameters ────────────────────────────────────────────────────────

export interface PaginacionParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface TiendaFiltros extends PaginacionParams {
  busqueda?: string;
}

export interface CatalogoFiltros extends PaginacionParams {
  area?: string;
  busqueda?: string;
}

export interface SolicitudFiltros extends PaginacionParams {
  estado?: EstadoSolicitud;
}

// ── Cart (client only) ──────────────────────────────────────────────────────

/**
 * A line in the buyer's cart. Held on the device only: the request is created in one
 * call at checkout, and the server is what prices it — `precio` here is the catalogue
 * price shown while shopping, for the running total.
 */
export interface CarritoLinea {
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  /** `0` when `precioOculto` is `true` — there is no catalogue price to preview with. */
  precio: number;
  /** Mirrors `ProductoCatalogo.precioOculto` at the moment this line was added. */
  precioOculto?: boolean;
  unidad?: string;
  imagenUrl?: string;
  disponible: boolean;
}
