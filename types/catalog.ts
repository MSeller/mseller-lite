import type { CreatedCustomer, CustomerBase } from "./documents";
import type { Product } from "./inventory";

/**
 * Master data an administrator can edit from the Catálogo tab.
 *
 * Mirrors the Consumo API contract (`GET /consumo/Cliente/{codigo}/editable`,
 * `PUT /consumo/Cliente/{codigo}` and the same pair under `/consumo/Producto`). The
 * server is what enforces who may call these — administrator and superuser only — and
 * answers 403 for anyone else.
 *
 * Both records are built from the app's existing models, so a field that already has a
 * name and a type is declared once.
 */

export type CatalogStatus = "A" | "I";

/** `T` with the listed fields widened to also accept `null`. */
type WithNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

/**
 * The editable customer record. Shares `CustomerBase` (and `email` with
 * `CreatedCustomer`); the fields below are the ones the editable record names or
 * types differently (`telefono1` and `condicion` instead of the summary's `telefono`
 * and `condicionPago`) or that only it carries.
 */
export interface ClienteEditable extends CustomerBase, Required<Pick<CreatedCustomer, "email">> {
  telefono1: string | null;
  referenciaDireccion: string | null;
  contacto: string | null;
  /** Payment condition code (`CondicionPago.condicionPago`). */
  condicion: string | null;
  limiteCredito: number;
  limiteFacturas: number;
  /** Percentage, 0-100. */
  descuento: number;
  status: CatalogStatus;
  notas: string | null;
}

/** `PUT /consumo/Cliente/{codigo}` — the code travels in the path and the balance is not editable. */
export type ClienteUpdateRequest = Omit<ClienteEditable, "codigo" | "balance">;

/** Product fields the editable record takes from `Product` unchanged. */
type ProductoEditableFields =
  | "codigo"
  | "nombre"
  | "descripcion"
  | "factor"
  | "precio1"
  | "precio2"
  | "precio3"
  | "precio4"
  | "precio5"
  | "costo"
  | "impuesto"
  | "descuento"
  | "visibleTienda"
  | "promocion"
  | "esServicio";

/** Text fields `Product` types as `string` that the editable record may send as `null`. */
type ProductoNullableFields =
  | "codigoBarra"
  | "area"
  | "departamento"
  | "unidad"
  | "empaque"
  | "tipoImpuesto";

/**
 * The editable product record: a subset of `Product` (no stock, images or internal
 * ids), with the optional text fields nullable and `status` narrowed to A/I.
 */
export type ProductoEditable = Pick<Product, ProductoEditableFields> &
  WithNullable<Pick<Product, ProductoNullableFields>, ProductoNullableFields> & {
    status: CatalogStatus;
  };

/** `PUT /consumo/Producto/{codigo}` — the code travels in the path. 409 when the barcode is taken. */
export type ProductoUpdateRequest = Omit<ProductoEditable, "codigo">;
