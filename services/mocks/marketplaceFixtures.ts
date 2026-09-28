import type {
  PagedResult,
  ProductoCatalogo,
  ProductoCatalogoDetalle,
  TiendaMarketplace,
  VendedorContacto,
} from "../../types/b2b";

/**
 * Sample marketplace data for development builds started with
 * `EXPO_PUBLIC_MOCK_MARKETPLACE=true` — store listing screenshots and design work when
 * the signed-in business has no suppliers on the marketplace. Never reaches production:
 * the switch in `b2bService` is also gated on `__DEV__`.
 */
export const MOCK_TIENDAS: TiendaMarketplace[] = [
  {
    id: "a1f0c2e4-0001-4b1e-9c1a-000000000001",
    nombre: "Distribuidora del Caribe",
    eslogan: "Abarrotes y bebidas para colmados, entrega en 24 horas",
    categoria: "Abarrotes",
    minimoPedido: 5000,
    estadoVinculo: "activa",
    permiteExploracionSinVinculo: true,
  },
  {
    id: "a1f0c2e4-0002-4b1e-9c1a-000000000002",
    nombre: "Lácteos La Vega",
    eslogan: "Leche, quesos y yogurt directo de la finca",
    categoria: "Lácteos",
    minimoPedido: 3000,
    estadoVinculo: "activa",
    permiteExploracionSinVinculo: true,
  },
  {
    id: "a1f0c2e4-0003-4b1e-9c1a-000000000003",
    nombre: "Panadería Industrial Cibao",
    eslogan: "Pan, galletas y repostería al por mayor",
    categoria: "Panadería",
    minimoPedido: 2500,
    estadoVinculo: "pendiente",
    permiteExploracionSinVinculo: true,
  },
  {
    id: "a1f0c2e4-0004-4b1e-9c1a-000000000004",
    nombre: "Bebidas del Este",
    eslogan: "Refrescos, jugos y agua en todas las presentaciones",
    categoria: "Bebidas",
    minimoPedido: 4000,
    estadoVinculo: null,
    permiteExploracionSinVinculo: true,
  },
  {
    id: "a1f0c2e4-0005-4b1e-9c1a-000000000005",
    nombre: "Higiene y Hogar RD",
    eslogan: "Limpieza, papel y cuidado personal",
    categoria: "Hogar",
    minimoPedido: 3500,
    estadoVinculo: null,
    permiteExploracionSinVinculo: false,
  },
  {
    id: "a1f0c2e4-0006-4b1e-9c1a-000000000006",
    nombre: "Carnes Frías Premium",
    eslogan: "Embutidos y quesos madurados, cadena de frío garantizada",
    categoria: "Carnes",
    minimoPedido: 6000,
    estadoVinculo: null,
    permiteExploracionSinVinculo: true,
  },
];

export const MOCK_AREAS = ["Granos", "Aceites", "Enlatados", "Bebidas", "Limpieza"];

const producto = (
  codigo: string,
  nombre: string,
  area: string,
  precio: number,
  empaque: string,
  factor: number,
  extra: Partial<ProductoCatalogo> = {},
): ProductoCatalogo => ({
  codigo,
  nombre,
  area,
  unidad: "CAJA",
  empaque,
  factor,
  impuesto: 18,
  promocion: false,
  precio,
  precioOculto: false,
  disponible: true,
  tieneVinculoActivo: true,
  ...extra,
});

export const MOCK_PRODUCTOS: ProductoCatalogo[] = [
  producto("ARR-2050", "Arroz Selecto grano largo 20 lb", "Granos", 1450, "4 fundas × 20 lb", 4, { promocion: true }),
  producto("HAB-0512", "Habichuelas rojas 1 lb", "Granos", 1980, "24 fundas × 1 lb", 24),
  producto("ACE-1128", "Aceite de soya 128 oz", "Aceites", 2310, "6 galones", 6),
  producto("ACE-0316", "Aceite de maíz 16 oz", "Aceites", 1560, "24 botellas", 24),
  producto("SAL-0402", "Salsa de tomate 8 oz", "Enlatados", 1120, "48 latas", 48),
  producto("SAR-0155", "Sardinas en aceite 155 g", "Enlatados", 1890, "50 latas", 50, { disponible: false }),
  producto("REF-2000", "Refresco cola 2 L", "Bebidas", 1340, "8 botellas", 8),
  producto("AGU-0500", "Agua purificada 500 ml", "Bebidas", 480, "24 botellas", 24, { promocion: true }),
  producto("CLO-3785", "Cloro concentrado 1 gal", "Limpieza", 1290, "4 galones", 4),
  producto("DET-1000", "Detergente en polvo 1 kg", "Limpieza", 1720, "12 fundas", 12),
];

export const MOCK_VENDEDOR: VendedorContacto = {
  codigo: "V-014",
  nombre: "Rafael Peña",
  telefono: "809-555-0143",
};

/** Wraps a fixture list as one page, the same shape the API returns. */
export const paged = <T>(items: T[], pageNumber = 1, pageSize = 20): PagedResult<T> => ({
  items,
  pageNumber,
  pageSize,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

export const mockProductDetail = (codigo: string): ProductoCatalogoDetalle | undefined => {
  const found = MOCK_PRODUCTOS.find((p) => p.codigo === codigo);
  return found && { ...found, imagenes: [] };
};
