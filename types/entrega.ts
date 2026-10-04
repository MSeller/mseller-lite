// =============================================
// Entrega (Driver Delivery) Types
// Mirrors the backend Consumo API consumo/entrega/* contracts.
// =============================================

import { RutaPreparacionStatus } from "./preparacion";

/** Delivery outcome for a route line. */
export type RutaDetalleStatus =
  | "activo"
  | "excluido"
  | "entregado"
  | "no_entregado"
  | "reasignado"
  | "parcial"
  | "entregar_despues"
  | "entregado_con_novedad";

export type TipoVehiculo = "camion" | "furgoneta" | "motocicleta" | "otro";

/** Generic paged wrapper returned by the Portal/Consumo list endpoints. */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** One route in the driver's list. */
export interface EntregaRuta {
  rutaId: number;
  noRuta: string;
  fecha: string;
  status: RutaPreparacionStatus;
  /** True when this is the driver's active route (en_ruta / lista_despacho). */
  esActiva: boolean;
  totalFacturas: number;
  facturasEntregadas: number;
  facturasPendientes: number;
  /** Active stops still waiting for an invoice: drivers work invoices only, so they are not listed. */
  pendientesFacturar?: number;
  vehiculoTipo?: TipoVehiculo | null;
  vehiculoPlaca?: string | null;
  observacion?: string | null;
}

/**
 * One of the customer's delivery windows on the route's weekday, in the business's local time
 * ("HH:mm"). From the customer's HorariosEntrega; empty when none are set.
 */
export interface VentanaEntrega {
  horaInicio: string;
  horaFin: string;
  observacion?: string | null;
}

/**
 * How a delivery under the invoice's payment condition may be collected (mseller-api#398).
 * Methods: efectivo, cheque, transferencia, tarjeta (collected by the driver) or credito
 * (left on the customer's account).
 */
export interface CondicionCobro {
  codigo: string;
  descripcion?: string | null;
  dias: number;
  /** COD: the driver must record how the customer paid before the delivery is saved. */
  contraEntrega: boolean;
  metodosPermitidos: string[];
}

/** One invoice/stop in the ordered delivery list. */
export interface EntregaFacturaResumen {
  rutaDetalleId: number;
  noPedidoStr: string;
  noFactura?: string | null;
  codigoCliente: string;
  nombreCliente?: string | null;
  direccion?: string | null;
  referenciaDireccion?: string | null;
  telefono?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  total: number;
  secuenciaEntrega: number;
  statusDetalle: RutaDetalleStatus;
  cargaConfirmada: boolean;
  /** Absent from APIs older than the delivery-window change. */
  ventanasEntrega?: VentanaEntrega[];
  /** Absent from APIs before the collection policy, or when the condition code is unknown. */
  condicionPago?: CondicionCobro | null;
}

/** Route header + ordered invoice list. */
export interface EntregaRutaDetalle {
  rutaId: number;
  noRuta: string;
  fecha: string;
  status: RutaPreparacionStatus;
  esActiva: boolean;
  vehiculoTipo?: TipoVehiculo | null;
  vehiculoPlaca?: string | null;
  /** Active stops still waiting for an invoice: drivers work invoices only, so they are not listed. */
  pendientesFacturar?: number;
  facturas: EntregaFacturaResumen[];
}

export interface EntregaFacturaLinea {
  codigoProducto: string;
  descripcion?: string | null;
  cantidad: number;
  unidad?: string | null;
  precio: number;
  subTotal: number;
}

export interface ItemFaltanteResumen {
  codigoProducto: string;
  cantidadFaltante: number;
  codigoMotivoRechazo?: string | null;
}

/** One earlier delivery attempt for the document, on any route (newest first). */
export interface IntentoEntregaResumen {
  intento: number;
  fecha: string;
  noRuta?: string | null;
  /** Driver of the route the attempt was made on. */
  chofer?: string | null;
  status: RutaDetalleStatus;
  codigoMotivoRechazo?: string | null;
  observacion?: string | null;
}

/** Snapshot of the latest delivery attempt recorded on this stop. */
export interface RutaEntregaResumen {
  /** Attempt number for the document across all routes. */
  intento?: number;
  noRuta?: string | null;
  status: RutaDetalleStatus;
  fechaEntrega: string;
  latitud?: number | null;
  longitud?: number | null;
  codigoMotivoRechazo?: string | null;
  observacion?: string | null;
  montoRecibido?: number | null;
  tipoPago?: string | null;
  fotoUrl?: string | null;
  firmaUrl?: string | null;
  itemsFaltantes: ItemFaltanteResumen[];
}

/** Full detail of a single invoice/stop. */
export interface EntregaFacturaDetalle {
  rutaDetalleId: number;
  noPedidoStr: string;
  noFactura?: string | null;
  codigoCliente: string;
  nombreCliente?: string | null;
  direccion?: string | null;
  referenciaDireccion?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  subTotal: number;
  impuesto: number;
  total: number;
  secuenciaEntrega: number;
  statusDetalle: RutaDetalleStatus;
  cargaConfirmada: boolean;
  ventanasEntrega?: VentanaEntrega[];
  condicionPago?: CondicionCobro | null;
  lineas: EntregaFacturaLinea[];
  entrega?: RutaEntregaResumen | null;
  /** Every other attempt for this document across routes, newest first. */
  intentosPrevios?: IntentoEntregaResumen[];
  /** Shortage reported at truck-load time — pre-fills a partial delivery at the stop. */
  faltantesCarga: ItemFaltanteResumen[];
}

export interface ItemFaltanteRequest {
  codigoProducto: string;
  cantidadFaltante: number;
  codigoMotivoRechazo?: string;
}

/** Payload for recording a delivery outcome. */
export interface RegistrarEntregaRequest {
  status: Extract<
    RutaDetalleStatus,
    "entregado" | "entregado_con_novedad" | "parcial" | "entregar_despues" | "no_entregado"
  >;
  latitud?: number;
  longitud?: number;
  codigoMotivoRechazo?: string;
  observacion?: string;
  firmaUrl?: string;
  fotoUrl?: string;
  /** What the customer handed over; for cash it can exceed `montoCobrado` (the rest is change). */
  montoRecibido?: number;
  /** The amount that applies to the invoice for this delivery (full total, or the delivered part). */
  montoCobrado?: number;
  /** efectivo | cheque | transferencia | tarjeta | credito (left on account) */
  tipoPago?: string;
  idempotencyKey?: string;
  dispositivoId?: string;
  itemsFaltantes?: ItemFaltanteRequest[];
}

export interface RegistrarEntregaResponse {
  confirmado: boolean;
  statusDetalle: RutaDetalleStatus;
  /** True when every active line now has a terminal outcome → route can be closed. */
  rutaCompletable: boolean;
}
