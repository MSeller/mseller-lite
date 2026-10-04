import { describe, expect, it } from "@jest/globals";

import {
  estadoCobro,
  loCobraElChofer,
  metodoInicial,
  metodosDisponibles,
  montoAdeudado,
  puedeConfirmarCobro,
} from "../deliveryPayment";

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

describe("loCobraElChofer / metodoInicial", () => {
  it("counts every method but credit as money the driver takes", () => {
    expect(["efectivo", "cheque", "transferencia", "tarjeta"].every(loCobraElChofer)).toBe(true);
    expect(loCobraElChofer("credito")).toBe(false);
    expect(loCobraElChofer("bitcoin")).toBe(false);
  });

  it("preselects cash when allowed", () => {
    expect(metodoInicial(["cheque", "efectivo"])).toBe("efectivo");
    expect(metodoInicial(["transferencia"])).toBe("transferencia");
    expect(metodoInicial([])).toBe("");
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

  it("reads a decimal comma", () => {
    expect(estadoCobro("efectivo", 236, "250,5")).toEqual({ tipo: "ok", recibido: 250.5, cambio: 14.5 });
  });

  it("waits for an amount, and needs none for other methods", () => {
    expect(estadoCobro("efectivo", 236, "")).toEqual({ tipo: "pendiente" });
    expect(estadoCobro("efectivo", 236, "12abc")).toEqual({ tipo: "pendiente" });
    expect(estadoCobro("transferencia", 236, "")).toEqual({ tipo: "exacto" });
  });
});

describe("puedeConfirmarCobro", () => {
  const cod = { codigo: "COD", dias: 0, contraEntrega: true, metodosPermitidos: ["efectivo"] };
  it("blocks short cash and a COD delivery without a method", () => {
    expect(puedeConfirmarCobro(cod, "efectivo", { tipo: "insuficiente", falta: 1 })).toBe(false);
    expect(puedeConfirmarCobro(cod, "", { tipo: "exacto" })).toBe(false);
    expect(puedeConfirmarCobro(cod, "efectivo", { tipo: "ok", recibido: 10, cambio: 0 })).toBe(true);
    expect(puedeConfirmarCobro(null, "", { tipo: "exacto" })).toBe(true);
  });
});
