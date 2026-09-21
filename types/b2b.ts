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
  logoUrl?: string;
  categoria?: string;
  minimoPedido?: number;
  /** `null`/absent means this buyer has no link with the store yet. */
  estadoVinculo?: EstadoVinculo | null;
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

/** A catalogue row. One price, already resolved server-side for this buyer. */
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
  precio: number;
  /** Coarse in/out of stock. NEVER a quantity — the store does not publish its stock. */
  disponible: boolean;
  /** Thumbnail for the grid. */
  imagenUrl?: string;
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
  precio: number;
  importe: number;
  unidad?: string;
}

export interface SolicitudB2B {
  id: string;
  /** e.g. `SOL-000123`. Shown to the buyer as soon as the request lands. */
  noSolicitud: string;
  tiendaId: string;
  tiendaNombre: string;
  estado: EstadoSolicitud;
  total: number;
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
  precio: number;
  unidad?: string;
  imagenUrl?: string;
  disponible: boolean;
}
