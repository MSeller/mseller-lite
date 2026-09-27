import { describe, expect, it } from "@jest/globals";

import { nuevaClaveIntento, puedeSalirARuta } from "../entregaAttempts";

describe("nuevaClaveIntento", () => {
  it("builds a per-tap key from the document, time and randomness", () => {
    expect(nuevaClaveIntento("FAC-1", 36 ** 3, () => 0)).toBe("FAC-1-1000-000000");
  });

  it("gives a different key to each tap on the same stop", () => {
    const a = nuevaClaveIntento("FAC-1", 1000, () => 0.1);
    const b = nuevaClaveIntento("FAC-1", 1000, () => 0.2);
    expect(a).not.toBe(b);
  });

  it("stays within the server's 100-character limit for long document numbers", () => {
    expect(nuevaClaveIntento("X".repeat(200), Date.now()).length).toBeLessThanOrEqual(100);
  });
});

describe("puedeSalirARuta", () => {
  it("allows leaving when every listed stop is loaded and none waits for an invoice", () => {
    expect(puedeSalirARuta({ total: 3, cargados: 3, pendientesFacturar: 0 })).toBe(true);
  });

  it("blocks while a stop is not loaded", () => {
    expect(puedeSalirARuta({ total: 3, cargados: 2 })).toBe(false);
  });

  it("blocks while the office still has to invoice a stop", () => {
    expect(puedeSalirARuta({ total: 3, cargados: 3, pendientesFacturar: 1 })).toBe(false);
  });

  it("blocks an empty route", () => {
    expect(puedeSalirARuta({ total: 0, cargados: 0 })).toBe(false);
  });
});
