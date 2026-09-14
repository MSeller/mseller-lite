/**
 * Master data an administrator can edit from the Catálogo tab.
 *
 * Mirrors the Consumo API contract (`GET /consumo/Cliente/{codigo}/editable`,
 * `PUT /consumo/Cliente/{codigo}` and the same pair under `/consumo/Producto`). The
 * server is what enforces who may call these — administrator and superuser only — and
 * answers 403 for anyone else.
 */

export type CatalogStatus = "A" | "I";

export interface ClienteEditable {
  codigo: string;
  nombre: string;
  rnc: string | null;
  telefono1: string | null;
  email: string | null;
  direccion: string | null;
  referenciaDireccion: string | null;
  ciudad: string | null;
  contacto: string | null;
  codigoVendedor: string | null;
  /** Payment condition code (`CondicionPago.condicionPago`). */
  condicion: string | null;
  limiteCredito: number;
  limiteFacturas: number;
  /** Percentage, 0-100. */
  descuento: number;
  status: CatalogStatus;
  notas: string | null;
  /** Read-only: what the customer owes, maintained by the ERP. */
  balance: number;
}

/** `PUT /consumo/Cliente/{codigo}` — the code travels in the path and the balance is not editable. */
export type ClienteUpdateRequest = Omit<ClienteEditable, "codigo" | "balance">;

export interface ProductoEditable {
  codigo: string;
  codigoBarra: string | null;
  nombre: string;
  descripcion: string | null;
  area: string | null;
  departamento: string | null;
  unidad: string | null;
  empaque: string | null;
  factor: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  precio5: number;
  costo: number;
  /** Tax percentage. */
  impuesto: number;
  /** Percentage, 0-100. */
  descuento: number;
  tipoImpuesto: string | null;
  status: CatalogStatus;
  visibleTienda: boolean;
  promocion: boolean;
  esServicio: boolean;
}

/** `PUT /consumo/Producto/{codigo}` — the code travels in the path. 409 when the barcode is taken. */
export type ProductoUpdateRequest = Omit<ProductoEditable, "codigo">;
