/**
 * Types for the online document-capture flow (invoices, orders and quotes).
 *
 * Mirrors the Consumo API's `consumo/Documento` contract. Unlike the delivery and
 * preparation flows, this one is ONLINE ONLY — there is no local queue and no
 * offline replay. Every screen that uses these types must be able to say "no
 * connection, try again" rather than pretend the document was captured.
 */

/** The three document types the lite app can create. */
export type DocumentType = "invoice" | "order" | "quote";

export const DOCUMENT_TYPES: DocumentType[] = ["invoice", "order", "quote"];

/**
 * Processing status, as the enum name the API serializes. Only the values a
 * freshly captured document can realistically show are listed; anything else
 * falls through to a generic label.
 */
export type DocumentStatus =
  | "pendiente"
  | "procesado"
  | "retenido"
  | "pendineteImprimir"
  | "condicionCredito"
  | "backorder"
  | "errorIntegracion"
  | "listoIntegrar"
  | "enviadoErp"
  | "aprobadoDespacho"
  | "rechazado"
  | "enDespacho"
  | "borrador";

export interface DocumentSummary {
  noPedidoStr: string;
  tipoDocumento: DocumentType | string;
  fecha: string;
  codigoCliente: string | null;
  nombreCliente: string | null;
  codigoVendedor: string | null;
  condicionPago: string | null;
  subTotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  moneda: string | null;
  ncf: string | null;
  procesado: DocumentStatus | string;
  anulado: boolean;
  cantidadLineas: number;
}

export interface DocumentLine {
  codigoProducto: string;
  descripcion: string | null;
  descripcionAdicional: string | null;
  cantidad: number;
  precio: number;
  factor: number;
  unidad: string | null;
  porcientoDescuento: number;
  descuento: number;
  porcientoImpuesto: number;
  impuesto: number;
  subTotal: number;
  total: number;
}

export interface DocumentDetail extends DocumentSummary {
  nota: string | null;
  fechaVencimiento: string | null;
  localidadId: number;
  detalle: DocumentLine[];
}

/** Server-side paging envelope (`PagedResult<T>`). */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ── Requests ────────────────────────────────────────────────────────────────

export interface CreateDocumentItem {
  codigoProducto: string;
  cantidad: number;
  /** Omit to sell at the product's list price. */
  precio?: number;
  factor?: number;
  porcientoDescuento?: number;
  descripcionAdicional?: string;
}

export interface NewCustomerRequest {
  /** Omit to let the server assign the next CLI-… code. */
  codigo?: string;
  nombre: string;
  telefono?: string;
  rnc?: string;
  direccion?: string;
  ciudad?: string;
  email?: string;
  condicionPago?: string;
  localidadId?: number;
  tipoComprobante?: string;
}

export interface CreateDocumentRequest {
  tipoDocumento: DocumentType;
  codigoCliente?: string;
  clienteNuevo?: NewCustomerRequest;
  codigoVendedor?: string;
  condicionPago?: string;
  localidadId?: number;
  nota?: string;
  fecha?: string;
  /**
   * Makes a retry safe. The app is online-only, but a request that times out on
   * a flaky mobile connection may still have committed — replaying it with the
   * same key returns the existing document instead of creating a duplicate.
   */
  idempotencyKey?: string;
  items: CreateDocumentItem[];
}

export interface DocumentListFilters {
  tipoDocumento?: DocumentType | DocumentType[];
  codigoCliente?: string;
  query?: string;
  /** `yyyy-MM-dd|yyyy-MM-dd`, the same format the portal list uses. */
  dates?: string;
  soloMisDocumentos?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ── Customers & products ────────────────────────────────────────────────────

export interface CustomerSummary {
  codigo: string;
  nombre: string;
  telefono: string | null;
  rnc: string | null;
  direccion: string | null;
  ciudad: string | null;
  condicionPago: string | null;
  codigoVendedor: string | null;
  localidadId: number;
  balance: number;
}

export interface CreatedCustomer extends CustomerSummary {
  email?: string | null;
}

export interface NewProductRequest {
  /** Omit to let the server derive a code from the name. */
  codigo?: string;
  nombre: string;
  precio: number;
  impuesto?: number;
  factor?: number;
  unidad?: string;
  descripcion?: string;
  codigoBarra?: string;
  costo?: number;
}

export interface CreatedProduct {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  impuesto: number;
  factor: number;
  unidad: string | null;
  codigoBarra: string | null;
  existencia: number;
}

// ── Cart (client-side draft state) ──────────────────────────────────────────

/**
 * One line being captured. Totals are computed locally for display only — the
 * server recomputes every amount on save and its result is authoritative.
 */
export interface CartLine {
  /** Stable key for list rendering; a product may legitimately appear twice. */
  key: string;
  codigoProducto: string;
  descripcion: string;
  unidad: string | null;
  cantidad: number;
  precio: number;
  precioLista: number;
  factor: number;
  porcientoImpuesto: number;
  porcientoDescuento: number;
  existencia: number;
}

export interface CartTotals {
  subTotal: number;
  descuento: number;
  impuesto: number;
  total: number;
}
