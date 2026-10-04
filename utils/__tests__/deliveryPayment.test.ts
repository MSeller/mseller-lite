import { describe, expect, it } from "@jest/globals";

import { estadoCobro, metodosDisponibles, montoAdeudado, parseMonto } from "../deliveryPayment";

const lineas = [
  { codigoProducto: "A", cantidad: 2, precio: 50, subTotal: 100 },
  { codigoProducto: "B", cantidad: 1, precio: 100, subTotal: 100 },
];

describe("metodosDisponibles", () => {
  it("uses the condition's methods, or the legacy four without a policy", () => {
    expect(
      metodosDisponibles({ codigo: "COD", dias: 0, contraEntrega: true, metodosPermitidos: ["efectivo"] })
    ).toEqual(["efectivo"]);
    expect(metodosDisponibles(null)).toEqual(["efectivo", "cheque", "transferencia", "credito"]);
  });
});

describe("montoAdeudado", () => {
  it("is the invoice total on a full delivery", () => {
    expect(montoAdeudado(236, lineas)).toBe(236);
  });

  it("charges the delivered share of the total (tax included) on a partial delivery", () => {
    // One of the two A units missing: 150 of 200 delivered → 75% of 236.
    expect(montoAdeudado(236, lineas, { A: 1 })).toBe(177);
  });
});

describe("parseMonto", () => {
  it("reads dots, decimal commas and thousand separators", () => {
    expect(parseMonto("1250.5")).toBe(1250.5);
    expect(parseMonto("1250,5")).toBe(1250.5);
    expect(parseMonto("1,250.50")).toBe(1250.5);
    expect(parseMonto("")).toBeNaN();
    expect(parseMonto("abc")).toBeNaN();
  });
});

describe("estadoCobro", () => {
  it("computes the change when the cash covers the amount due", () => {
    expect(estadoCobro("efectivo", 236, "300")).toEqual({ tipo: "ok", recibido: 300, cambio: 64 });
    expect(estadoCobro("efectivo", 236, "236")).toEqual({ tipo: "ok", recibido: 236, cambio: 0 });
  });

  it("blocks cash below the amount due and says how much is missing", () => {
    expect(estadoCobro("efectivo", 236, "200")).toEqual({ tipo: "insuficiente", falta: 36 });
  });

  it("waits for an amount, and needs none for other methods", () => {
    expect(estadoCobro("efectivo", 236, "")).toEqual({ tipo: "pendiente" });
    expect(estadoCobro("transferencia", 236, "")).toEqual({ tipo: "exacto" });
  });
});
