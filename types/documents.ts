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
  /** The customer's address, used to pre-fill the email recipient. */
  emailCliente?: string | null;
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
  /**
   * Discount PERCENTAGE (0-100), not an amount. Named `descuento` to match the
   * server's shared creation contract, which the MCP write tools publish under
   * that name too.
   */
  descuento?: number;
  descripcionAdicional?: string;
}

/**
 * Registering a customer on its own (`POST consumo/Cliente`).
 *
 * Note `tipoCliente` here vs `tipoComprobante` on {@link InlineCustomerRequest}:
 * the same concept under two names, because the server's two published creation
 * schemas disagree. Not ours to reconcile from this side.
 */
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
  /** Fiscal document type (e.g. "B01"). */
  tipoCliente?: string;
}

/**
 * A customer captured together with the document that needs it, so it is created
 * inside that document's transaction rather than before it.
 */
export interface InlineCustomerRequest {
  /** Omit to let the server assign the next CLI-… code. */
  codigo?: string;
  nombre: string;
  telefono?: string;
  rnc?: string;
  /** Fiscal document type (e.g. "B01"). */
  tipoComprobante?: string;
  direccion?: string;
  ciudad?: string;
  email?: string;
  localidadId?: number;
}

export interface CreateDocumentRequest {
  tipoDocumento: DocumentType;
  codigoCliente?: string;
  nuevoCliente?: InlineCustomerRequest;
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
  /** Main sale price. Named `precio1` to match the server's shared contract. */
  precio1: number;
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

// ── Sharing: print, PDF and email ───────────────────────────────────────────

/**
 * Where a queued email currently stands. `Enviado` means the outbox handed it to
 * the mail provider — whether it reached the inbox is a different question, which
 * `entregas` answers once the provider's webhook arrives.
 */
export type SendState = "Pendiente" | "Enviando" | "Enviado" | "Fallido" | "Cancelado";

export interface DocumentSend {
  id: string;
  documentoId: string;
  estado: SendState;
  destinatarios: string[];
  copia: string[];
  asunto: string;
  intentos: number;
  nombreArchivo?: string | null;
  errorMensaje?: string | null;
  creadoEn: string;
  creadoPor?: string | null;
  enviadoEn?: string | null;
  /** Set when this send is a re-send; points at the original. */
  reenvioDeId?: string | null;
}

/** Print count and send history — what decides "Print" vs "Re-print". */
export interface DocumentShareHistory {
  noPedidoStr: string;
  vecesImpreso: number;
  ultimaImpresion?: string | null;
  ultimoUsuarioImpresion?: string | null;
  envios: DocumentSend[];
}

export interface SendDocumentRequest {
  /** Omit to send to the customer's own address, which the server resolves. */
  destinatarios?: string[];
  mensaje?: string;
}
