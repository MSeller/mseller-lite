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
  vehiculoTipo?: TipoVehiculo | null;
  vehiculoPlaca?: string | null;
  observacion?: string | null;
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

/** Snapshot of a previously recorded delivery event. */
export interface RutaEntregaResumen {
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
  lineas: EntregaFacturaLinea[];
  entrega?: RutaEntregaResumen | null;
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
  montoRecibido?: number;
  /** efectivo | cheque | transferencia | credito | debito */
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
