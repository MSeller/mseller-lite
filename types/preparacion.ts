// =============================================
// Preparación (O2D Wave Picking) Types
// =============================================

/** Route status in the O2D workflow */
export type RutaPreparacionStatus =
  | "borrador"
  | "confirmada"
  | "en_preparacion"
  | "lista_despacho"
  | "en_ruta"
  | "completada"
  | "cancelada";

/** Route summary shown in the Preparación tab list */
export interface RutaPreparacion {
  rutaId: number;
  noRuta: string;
  status: RutaPreparacionStatus;
  fechaRuta: string;
  distribuidor: string;
  vehiculo: string;
  totalPedidos: number;
  totalProductos: number;
  productosPreparados: number;
}

// ---- M1: Consolidated Picking ----

export interface ConsolidadoDistribucion {
  codigoCliente: string;
  nombreCliente?: string;
  cantidad: number;
}

export interface ConsolidadoProducto {
  codigoProducto: string;
  nombreProducto: string;
  ubicacion?: string;
  cantidadTotal: number;
  unidad?: string;
  distribucion: ConsolidadoDistribucion[];
}

export interface ConsolidadoZona {
  zonaId?: number;
  zonaNombre: string;
  productos: ConsolidadoProducto[];
}

export interface ConsolidadoResponse {
  rutaId: number;
  noRuta: string;
  zonas: ConsolidadoZona[];
}

// ---- M2: Confirm & Distribute ----

export interface DistribucionCliente {
  codigoCliente: string;
  cantidad: number;
}

export interface ConfirmarProductoRequest {
  rutaId: number;
  codigoProducto: string;
  cantidadTotal: number;
  distribucion?: DistribucionCliente[];
  observacion?: string;
}

// ---- M4: Summary ----

export interface SummaryProducto {
  codigoProducto: string;
  descripcion: string;
  cantidadSolicitada: number;
  cantidadConfirmada: number;
  unidad: string;
}

export interface SummaryZona {
  zona: string;
  productos: SummaryProducto[];
}

export interface SummaryClienteProducto {
  codigoProducto: string;
  descripcion: string;
  cantidadSolicitada: number;
  cantidadConfirmada: number;
}

export interface SummaryCliente {
  codigoCliente: string;
  nombreCliente: string;
  productos: SummaryClienteProducto[];
}

export interface SummaryResponse {
  rutaId: number;
  noRuta: string;
  zonas: SummaryZona[];
  clientes: SummaryCliente[];
}

// ---- M5: Truck Loading (Carga) ----

export interface CargaProducto {
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
}

export interface CargaCliente {
  rutaDetalleId: number;
  codigoCliente: string;
  nombreCliente: string;
  direccion?: string | null;
  referenciaDireccion?: string | null;
  /** The final invoice number the driver is loading. */
  noFactura: string;
  noPedidoStr: string;
  secuenciaEntrega: number;
  totalBultos: number;
  confirmado: boolean;
  /** True when this invoice was confirmed loaded but with a reported shortage. */
  conIncidencia: boolean;
  /** Reason/note captured on confirm-with-issue (or decline). */
  cargaObservacion?: string | null;
  productos: CargaProducto[];
}

export interface CargaResponse {
  rutaId: number;
  noRuta: string;
  vehiculoPlaca?: string | null;
  vehiculoTipo?: string | null;
  vehiculoDescripcion?: string | null;
  codigoDistribuidor?: string | null;
  nombreDistribuidor?: string | null;
  clientes: CargaCliente[];
}

/** An item that could not be loaded (missing/short) — reported via confirm-with-issue. */
export interface ItemCargaFaltante {
  codigoProducto: string;
  cantidadFaltante: number;
}

/** Body for confirming a load. Send itemsFaltantes to confirm-with-issue. */
export interface ConfirmarCargaBody {
  items?: ItemCargaConfirmacion[];
  itemsFaltantes?: ItemCargaFaltante[];
  observacion?: string;
}

export interface ConfirmarCargaResponse {
  confirmado: boolean;
  totalClientes: number;
  clientesConfirmados: number;
  rutaDespachada: boolean;
}

export interface ItemCargaConfirmacion {
  codigoProducto: string;
  cantidadCargada: number;
}
