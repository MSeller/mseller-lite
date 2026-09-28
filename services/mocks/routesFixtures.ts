import type { EntregaRuta } from "../../types/entrega";
import type { RutaPreparacion } from "../../types/preparacion";

/**
 * Sample routes for development builds started with `EXPO_PUBLIC_MOCK_ROUTES=true` —
 * store screenshots of Preparación and Entregas when the signed-in business has no
 * routes in flight. Never reaches production: the switches in the services are also
 * gated on `__DEV__`.
 */
export const MOCK_RUTAS_PREPARACION: RutaPreparacion[] = [
  {
    rutaId: 9101,
    noRuta: "RT-2026-0412",
    status: "en_preparacion",
    fechaRuta: "2026-09-28",
    distribuidor: "Camión 03 · José Almonte",
    vehiculo: "Isuzu NPR · A123456",
    totalPedidos: 18,
    totalProductos: 142,
    productosPreparados: 97,
  },
  {
    rutaId: 9102,
    noRuta: "RT-2026-0413",
    status: "lista_despacho",
    fechaRuta: "2026-09-28",
    distribuidor: "Camión 01 · Pedro Guzmán",
    vehiculo: "Hino 300 · L654321",
    totalPedidos: 12,
    totalProductos: 88,
    productosPreparados: 88,
  },
  {
    rutaId: 9103,
    noRuta: "RT-2026-0414",
    status: "en_preparacion",
    fechaRuta: "2026-09-29",
    distribuidor: "Camión 02 · Luis Mejía",
    vehiculo: "Mitsubishi Canter · G778899",
    totalPedidos: 24,
    totalProductos: 210,
    productosPreparados: 36,
  },
  {
    rutaId: 9104,
    noRuta: "RT-2026-0415",
    status: "confirmada",
    fechaRuta: "2026-09-29",
    distribuidor: "Camión 04 · Ana Reyes",
    vehiculo: "Isuzu ELF · A445566",
    totalPedidos: 9,
    totalProductos: 61,
    productosPreparados: 0,
  },
];

export const MOCK_RUTAS_ENTREGA: EntregaRuta[] = [
  {
    rutaId: 9102,
    noRuta: "RT-2026-0413",
    fecha: "2026-09-28",
    status: "en_ruta",
    esActiva: true,
    totalFacturas: 12,
    facturasEntregadas: 7,
    facturasPendientes: 5,
    vehiculoPlaca: "L654321",
    observacion: "Zona Norte · Santiago",
  },
  {
    rutaId: 9099,
    noRuta: "RT-2026-0410",
    fecha: "2026-09-27",
    status: "completada",
    esActiva: false,
    totalFacturas: 15,
    facturasEntregadas: 15,
    facturasPendientes: 0,
    vehiculoPlaca: "L654321",
  },
  {
    rutaId: 9095,
    noRuta: "RT-2026-0406",
    fecha: "2026-09-26",
    status: "completada",
    esActiva: false,
    totalFacturas: 11,
    facturasEntregadas: 10,
    facturasPendientes: 1,
    vehiculoPlaca: "L654321",
  },
];
