import {
  EstadoConteo,
  TipoConteo,
  type InventarioConteo,
  type ProductoConteo,
  type ResumenConteo,
} from "../../types/inventory";

/**
 * Sample stock count for development builds started with `EXPO_PUBLIC_MOCK_INVENTORY=true`
 * (store screenshots of Conteo). Never reaches production: the switches in the service
 * are also gated on `__DEV__`.
 */
export const MOCK_CONTEO: InventarioConteo = {
  id: 501,
  tipoConteo: TipoConteo.ConteoCiclico,
  localidadId: 1,
  fechaInicio: "2026-09-28T08:00:00",
  descripcion: "Conteo cíclico · Almacén principal · Pasillo A",
  estado: EstadoConteo.EnProgreso,
  planificadoPor: "Ana Reyes",
  iniciadoPor: "Luis Mejía",
  fechaCreacion: "2026-09-27T17:30:00",
  fechaActualizacion: "2026-09-28T10:15:00",
};

export const MOCK_RESUMEN: ResumenConteo = {
  conteoId: 501,
  totalProductosContados: 120,
  productosContados: 84,
  productosPendientes: 36,
  porcentajeCompletado: 70,
  discrepanciasEncontradas: 3,
  valorTotalDiscrepancias: 1240.5,
  ultimaActualizacion: "2026-09-28T10:15:00",
  estado: EstadoConteo.EnProgreso,
};

const producto = (
  codigo: string,
  codigoBarra: string,
  nombre: string,
  ubicacion: string,
  existencia: number,
  precio: number,
): ProductoConteo => ({
  codigo,
  codigoBarra,
  nombre,
  descripcion: null,
  area: "Abarrotes",
  iDArea: 1,
  grupoId: null,
  zona: "Pasillo A",
  zonaId: 1,
  zonaEntity: null,
  ubicacion,
  ubicacionDetallada: `Pasillo A · ${ubicacion}`,
  departamento: null,
  ultCompra: null,
  precio1: precio,
  precio2: precio,
  precio3: precio,
  precio4: precio,
  precio5: precio,
  costo: precio * 0.8,
  existenciaAlmacen1: existencia,
  existenciaAlmacen2: 0,
  existenciaAlmacen3: 0,
  existenciaAlmacen4: 0,
  existenciaAlmacen5: 0,
  existenciaAlmacen6: 0,
  existenciaAlmacen7: 0,
  unidad: "UND",
  empaque: "CAJA",
  impuesto: 18,
  factor: 1,
  iSC: 0,
  aDV: 0,
  descuento: 0,
  tipoImpuesto: null,
  apartado: 0,
  status: "A",
  promocion: false,
  businessId: "demo",
  esServicio: false,
  visibleTienda: true,
  imagenes: null,
  existencias: null,
});

export const MOCK_PRODUCTOS_CONTEO: ProductoConteo[] = [
  producto("ARR-2050", "7460123456789", "Arroz Selecto grano largo 20 lb", "Estante 1 · Nivel 2", 48, 1450),
  producto("HAB-0512", "7460123456796", "Habichuelas rojas 1 lb", "Estante 1 · Nivel 3", 120, 82.5),
  producto("ACE-1128", "7460123456802", "Aceite de soya 128 oz", "Estante 2 · Nivel 1", 36, 385),
  producto("SAL-0402", "7460123456819", "Salsa de tomate 8 oz", "Estante 2 · Nivel 2", 240, 23.3),
  producto("AGU-0500", "7460123456826", "Agua purificada 500 ml", "Estante 3 · Nivel 1", 600, 20),
];
