import { describe, expect, it } from "@jest/globals";

import type { ClienteEditable, ProductoEditable } from "../../types/catalog";
import {
  buildCustomerUpdate,
  buildProductUpdate,
  customerToForm,
  describeCatalogError,
  hasErrors,
  isFormDirty,
  productToForm,
  validateCustomerForm,
  validateProductForm,
} from "../catalogValidation";

const cliente: ClienteEditable = {
  codigo: "CLI-001",
  nombre: "Colmado La Esquina",
  rnc: "101010101",
  telefono1: "809-555-0101",
  email: "compras@esquina.do",
  direccion: "Calle 1 #2",
  referenciaDireccion: null,
  ciudad: "Santiago",
  contacto: "Ana",
  codigoVendedor: "V01",
  condicion: "CR30",
  limiteCredito: 50000,
  limiteFacturas: 3,
  descuento: 5,
  status: "A",
  notas: null,
  balance: 1250.5,
};

const producto: ProductoEditable = {
  codigo: "P-100",
  codigoBarra: "7460001000012",
  nombre: "Arroz 5 lb",
  descripcion: null,
  area: "Granos",
  departamento: "Alimentos",
  unidad: "UND",
  empaque: "Saco",
  factor: 1,
  precio1: 325.5,
  precio2: 310,
  precio3: 0,
  precio4: 0,
  precio5: 0,
  costo: 250,
  impuesto: 18,
  descuento: 0,
  tipoImpuesto: "ITBIS",
  status: "A",
  visibleTienda: true,
  promocion: false,
  esServicio: false,
};

describe("customer form", () => {
  it("round-trips a record into the PUT body without code or balance", () => {
    const body = buildCustomerUpdate(customerToForm(cliente));
    const { codigo: _codigo, balance: _balance, ...expected } = cliente;
    expect(body).toEqual(expected);
    expect(body).not.toHaveProperty("codigo");
    expect(body).not.toHaveProperty("balance");
  });

  it("is valid as loaded", () => {
    expect(validateCustomerForm(customerToForm(cliente))).toEqual({});
  });

  it("requires a name", () => {
    const form = { ...customerToForm(cliente), nombre: "   " };
    expect(validateCustomerForm(form)).toEqual({ nombre: "required" });
  });

  it("checks the email format but allows it empty", () => {
    const base = customerToForm(cliente);
    expect(validateCustomerForm({ ...base, email: "no-es-correo" })).toEqual({ email: "email" });
    expect(validateCustomerForm({ ...base, email: "" })).toEqual({});
  });

  it("rejects negative limits and discounts over 100", () => {
    const form = {
      ...customerToForm(cliente),
      limiteCredito: "-1",
      limiteFacturas: "x",
      descuento: "100.5",
    };
    expect(validateCustomerForm(form)).toEqual({
      limiteCredito: "nonNegative",
      limiteFacturas: "number",
      descuento: "maxPercent",
    });
  });

  it("requires a whole number of invoices", () => {
    const base = customerToForm(cliente);
    expect(validateCustomerForm({ ...base, limiteFacturas: "2,5" })).toEqual({ limiteFacturas: "integer" });
    expect(validateCustomerForm({ ...base, limiteFacturas: "2" })).toEqual({});
  });

  it("reads a lower-case status as the same status", () => {
    expect(customerToForm({ ...cliente, status: "i" as never }).status).toBe("I");
  });

  it("allows a discount of exactly 0 or 100", () => {
    const base = customerToForm(cliente);
    expect(hasErrors(validateCustomerForm({ ...base, descuento: "0" }))).toBe(false);
    expect(hasErrors(validateCustomerForm({ ...base, descuento: "100" }))).toBe(false);
  });

  it("rejects an unknown status", () => {
    const form = { ...customerToForm(cliente), status: "X" as never };
    expect(validateCustomerForm(form)).toEqual({ status: "status" });
  });

  it("sends blank text as null, trims, and parses comma decimals", () => {
    const form = {
      ...customerToForm(cliente),
      nombre: "  Nuevo Nombre ",
      email: "  ",
      notas: "",
      limiteCredito: "1500,75",
    };
    const body = buildCustomerUpdate(form);
    expect(body.nombre).toBe("Nuevo Nombre");
    expect(body.email).toBeNull();
    expect(body.notas).toBeNull();
    expect(body.limiteCredito).toBe(1500.75);
  });

  it("maps null fields to empty inputs", () => {
    const form = customerToForm({ ...cliente, rnc: null, condicion: null });
    expect(form.rnc).toBe("");
    expect(form.condicion).toBe("");
  });
});

describe("product form", () => {
  it("round-trips a record into the PUT body without the code", () => {
    const body = buildProductUpdate(productToForm(producto));
    const { codigo: _codigo, ...expected } = producto;
    expect(body).toEqual(expected);
  });

  it("is valid as loaded", () => {
    expect(validateProductForm(productToForm(producto))).toEqual({});
  });

  it("requires a name and a factor above zero", () => {
    const form = { ...productToForm(producto), nombre: "", factor: "0" };
    expect(validateProductForm(form)).toEqual({ nombre: "required", factor: "positive" });
  });

  it("rejects negative prices, cost and tax, and discounts over 100", () => {
    const form = {
      ...productToForm(producto),
      precio3: "-5",
      costo: "-1",
      impuesto: "-18",
      descuento: "150",
    };
    expect(validateProductForm(form)).toEqual({
      precio3: "nonNegative",
      costo: "nonNegative",
      impuesto: "nonNegative",
      descuento: "maxPercent",
    });
  });

  it("caps the tax percentage at 100", () => {
    const base = productToForm(producto);
    expect(validateProductForm({ ...base, impuesto: "118" })).toEqual({ impuesto: "maxPercent" });
    expect(validateProductForm({ ...base, impuesto: "100" })).toEqual({});
  });

  it("flags text typed into a price", () => {
    expect(validateProductForm({ ...productToForm(producto), precio1: "12a" })).toEqual({ precio1: "number" });
  });

  it("keeps the booleans and sends a blank barcode as null", () => {
    const form = { ...productToForm(producto), codigoBarra: " ", promocion: true, visibleTienda: false };
    const body = buildProductUpdate(form);
    expect(body.codigoBarra).toBeNull();
    expect(body.promocion).toBe(true);
    expect(body.visibleTienda).toBe(false);
  });
});

describe("isFormDirty", () => {
  it("is false for an untouched form and true after a change", () => {
    const initial = productToForm(producto);
    expect(isFormDirty(initial, { ...initial })).toBe(false);
    expect(isFormDirty(initial, { ...initial, esServicio: true })).toBe(true);
    expect(isFormDirty(initial, { ...initial, precio1: "325.50" })).toBe(true);
  });
});

describe("describeCatalogError", () => {
  const axiosError = (status: number, data?: unknown) => ({ response: { status, data } });

  it("classifies the statuses the catalog endpoints answer and keeps the server message", () => {
    expect(describeCatalogError(axiosError(403, { message: "Solo administradores" }))).toEqual({
      kind: "forbidden",
      message: "Solo administradores",
    });
    expect(describeCatalogError(axiosError(404, { message: "No existe" })).kind).toBe("notFound");
    expect(describeCatalogError(axiosError(409, { message: "Código de barras en uso" }))).toEqual({
      kind: "conflict",
      message: "Código de barras en uso",
    });
    expect(describeCatalogError(axiosError(400, { message: "Nombre requerido" })).kind).toBe("invalid");
  });

  it("falls back to a generic failure without a response or message", () => {
    expect(describeCatalogError(new Error("Network Error"))).toEqual({ kind: "failed", message: null });
    expect(describeCatalogError(axiosError(500, "<html>"))).toEqual({ kind: "failed", message: null });
    expect(describeCatalogError(null)).toEqual({ kind: "failed", message: null });
  });
});
