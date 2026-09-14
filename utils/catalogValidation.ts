import type {
  CatalogStatus,
  ClienteEditable,
  ClienteUpdateRequest,
  ProductoEditable,
  ProductoUpdateRequest,
} from "../types/catalog";

/**
 * Pure form logic for the admin Catálogo (customers and products).
 *
 * The edit forms hold every field as the text the user typed, so a half-typed "12,"
 * is not silently turned into 12 behind their back. This module converts records to
 * that shape and back, and mirrors the Consumo API's validation so a save that the
 * server would reject with 400 is caught before it leaves the phone. The server stays
 * the authority: anything it still rejects is shown with its own message.
 */

/** Translated under `catalog.validation.<code>`. */
export type ValidationCode =
  | "required"
  | "email"
  | "number"
  | "nonNegative"
  | "integer"
  | "maxPercent"
  | "positive"
  | "status";

export type FieldErrors<K extends string> = Partial<Record<K, ValidationCode>>;

// ── Shared helpers ──────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Strict decimal parse of what someone typed. Accepts a comma as the decimal
 * separator (what a Spanish keyboard offers) and treats an empty field as 0.
 * Returns `null` for anything that is not entirely a number — unlike `parseFloat`,
 * "12abc" is not 12.
 */
export const parseDecimal = (raw: string): number | null => {
  const text = raw.replace(/\s/g, "").replace(",", ".");
  if (text === "") return 0;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/** Number → field text. Whole numbers lose their decimals; others keep what they have. */
export const numberToField = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "0" : String(value);

/** Trimmed text, or `null` when nothing is left — the server stores absent values as NULL. */
export const textOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value.trim());

export const isValidStatus = (value: string): value is CatalogStatus =>
  value === "A" || value === "I";

type NumberRule = "nonNegative" | "count" | "percent" | "positive";

const checkNumber = (raw: string, rule: NumberRule): ValidationCode | undefined => {
  const value = parseDecimal(raw);
  if (value === null) return "number";
  if (rule === "positive") return value > 0 ? undefined : "positive";
  if (value < 0) return "nonNegative";
  if (rule === "count" && !Number.isInteger(value)) return "integer";
  if (rule === "percent" && value > 100) return "maxPercent";
  return undefined;
};

const collect = <K extends string>(checks: [K, ValidationCode | undefined][]): FieldErrors<K> => {
  const errors: FieldErrors<K> = {};
  for (const [field, code] of checks) {
    if (code) errors[field] = code;
  }
  return errors;
};

export const hasErrors = (errors: FieldErrors<string>): boolean => Object.keys(errors).length > 0;

/** Shallow comparison of two form states: the "unsaved changes" test. */
export const isFormDirty = <T extends object>(initial: T, current: T): boolean =>
  (Object.keys(initial) as (keyof T)[]).some((key) => initial[key] !== current[key]);

// ── Customers ───────────────────────────────────────────────────────────────

export interface CustomerForm {
  nombre: string;
  rnc: string;
  telefono1: string;
  email: string;
  direccion: string;
  referenciaDireccion: string;
  ciudad: string;
  contacto: string;
  codigoVendedor: string;
  condicion: string;
  limiteCredito: string;
  limiteFacturas: string;
  descuento: string;
  status: CatalogStatus;
  notas: string;
}

export const customerToForm = (cliente: ClienteEditable): CustomerForm => ({
  nombre: cliente.nombre ?? "",
  rnc: cliente.rnc ?? "",
  telefono1: cliente.telefono1 ?? "",
  email: cliente.email ?? "",
  direccion: cliente.direccion ?? "",
  referenciaDireccion: cliente.referenciaDireccion ?? "",
  ciudad: cliente.ciudad ?? "",
  contacto: cliente.contacto ?? "",
  codigoVendedor: cliente.codigoVendedor ?? "",
  condicion: cliente.condicion ?? "",
  limiteCredito: numberToField(cliente.limiteCredito),
  limiteFacturas: numberToField(cliente.limiteFacturas),
  descuento: numberToField(cliente.descuento),
  status: cliente.status?.toUpperCase() === "I" ? "I" : "A",
  notas: cliente.notas ?? "",
});

export const validateCustomerForm = (form: CustomerForm): FieldErrors<keyof CustomerForm> =>
  collect<keyof CustomerForm>([
    ["nombre", form.nombre.trim() ? undefined : "required"],
    ["email", !form.email.trim() || isValidEmail(form.email) ? undefined : "email"],
    ["limiteCredito", checkNumber(form.limiteCredito, "nonNegative")],
    ["limiteFacturas", checkNumber(form.limiteFacturas, "count")],
    ["descuento", checkNumber(form.descuento, "percent")],
    ["status", isValidStatus(form.status) ? undefined : "status"],
  ]);

/** The PUT body. Call only on a form that validated — invalid numbers fall back to 0. */
export const buildCustomerUpdate = (form: CustomerForm): ClienteUpdateRequest => ({
  nombre: form.nombre.trim(),
  rnc: textOrNull(form.rnc),
  telefono1: textOrNull(form.telefono1),
  email: textOrNull(form.email),
  direccion: textOrNull(form.direccion),
  referenciaDireccion: textOrNull(form.referenciaDireccion),
  ciudad: textOrNull(form.ciudad),
  contacto: textOrNull(form.contacto),
  codigoVendedor: textOrNull(form.codigoVendedor),
  condicion: textOrNull(form.condicion),
  limiteCredito: parseDecimal(form.limiteCredito) ?? 0,
  limiteFacturas: parseDecimal(form.limiteFacturas) ?? 0,
  descuento: parseDecimal(form.descuento) ?? 0,
  status: form.status,
  notas: textOrNull(form.notas),
});

// ── Products ────────────────────────────────────────────────────────────────

export const PRICE_FIELDS = ["precio1", "precio2", "precio3", "precio4", "precio5"] as const;

export interface ProductForm {
  codigoBarra: string;
  nombre: string;
  descripcion: string;
  area: string;
  departamento: string;
  unidad: string;
  empaque: string;
  factor: string;
  precio1: string;
  precio2: string;
  precio3: string;
  precio4: string;
  precio5: string;
  costo: string;
  impuesto: string;
  descuento: string;
  tipoImpuesto: string;
  status: CatalogStatus;
  visibleTienda: boolean;
  promocion: boolean;
  esServicio: boolean;
}

export const productToForm = (producto: ProductoEditable): ProductForm => ({
  codigoBarra: producto.codigoBarra ?? "",
  nombre: producto.nombre ?? "",
  descripcion: producto.descripcion ?? "",
  area: producto.area ?? "",
  departamento: producto.departamento ?? "",
  unidad: producto.unidad ?? "",
  empaque: producto.empaque ?? "",
  factor: numberToField(producto.factor),
  precio1: numberToField(producto.precio1),
  precio2: numberToField(producto.precio2),
  precio3: numberToField(producto.precio3),
  precio4: numberToField(producto.precio4),
  precio5: numberToField(producto.precio5),
  costo: numberToField(producto.costo),
  impuesto: numberToField(producto.impuesto),
  descuento: numberToField(producto.descuento),
  tipoImpuesto: producto.tipoImpuesto ?? "",
  status: producto.status?.toUpperCase() === "I" ? "I" : "A",
  visibleTienda: !!producto.visibleTienda,
  promocion: !!producto.promocion,
  esServicio: !!producto.esServicio,
});

export const validateProductForm = (form: ProductForm): FieldErrors<keyof ProductForm> =>
  collect<keyof ProductForm>([
    ["nombre", form.nombre.trim() ? undefined : "required"],
    ["factor", checkNumber(form.factor, "positive")],
    ...PRICE_FIELDS.map(
      (field) => [field, checkNumber(form[field], "nonNegative")] as [keyof ProductForm, ValidationCode | undefined]
    ),
    ["costo", checkNumber(form.costo, "nonNegative")],
    ["impuesto", checkNumber(form.impuesto, "nonNegative")],
    ["descuento", checkNumber(form.descuento, "percent")],
    ["status", isValidStatus(form.status) ? undefined : "status"],
  ]);

/** The PUT body. Call only on a form that validated — invalid numbers fall back to 0 (factor to 1). */
export const buildProductUpdate = (form: ProductForm): ProductoUpdateRequest => ({
  codigoBarra: textOrNull(form.codigoBarra),
  nombre: form.nombre.trim(),
  descripcion: textOrNull(form.descripcion),
  area: textOrNull(form.area),
  departamento: textOrNull(form.departamento),
  unidad: textOrNull(form.unidad),
  empaque: textOrNull(form.empaque),
  factor: parseDecimal(form.factor) ?? 1,
  precio1: parseDecimal(form.precio1) ?? 0,
  precio2: parseDecimal(form.precio2) ?? 0,
  precio3: parseDecimal(form.precio3) ?? 0,
  precio4: parseDecimal(form.precio4) ?? 0,
  precio5: parseDecimal(form.precio5) ?? 0,
  costo: parseDecimal(form.costo) ?? 0,
  impuesto: parseDecimal(form.impuesto) ?? 0,
  descuento: parseDecimal(form.descuento) ?? 0,
  tipoImpuesto: textOrNull(form.tipoImpuesto),
  status: form.status,
  visibleTienda: form.visibleTienda,
  promocion: form.promocion,
  esServicio: form.esServicio,
});

// ── Server errors ───────────────────────────────────────────────────────────

export type CatalogRequestError =
  | { kind: "forbidden"; message: string | null }
  | { kind: "notFound"; message: string | null }
  | { kind: "conflict"; message: string | null }
  | { kind: "invalid"; message: string | null }
  | { kind: "failed"; message: string | null };

/**
 * Classifies a failed catalog request. The Consumo API answers `{ message }` with
 * 400 / 403 / 404 / 409; that message is what the admin should read, so it is kept.
 */
export const describeCatalogError = (error: unknown): CatalogRequestError => {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = response?.data as { message?: unknown } | undefined;
  const message =
    data && typeof data.message === "string" && data.message.trim() ? data.message.trim() : null;

  switch (response?.status) {
    case 403:
      return { kind: "forbidden", message };
    case 404:
      return { kind: "notFound", message };
    case 409:
      return { kind: "conflict", message };
    case 400:
      return { kind: "invalid", message };
    default:
      return { kind: "failed", message };
  }
};
