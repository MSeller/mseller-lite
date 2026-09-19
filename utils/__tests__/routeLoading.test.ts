import { describe, expect, it } from "@jest/globals";

import type { CargaCliente } from "../../types/preparacion";
import {
  cargaHabilitada,
  esPreparacionCerrada,
  estadoFacturacion,
  isEsperandoFacturacion,
  preparacionAbierta,
  preparacionCompletada,
  resumenCarga,
} from "../routeLoading";

const cliente = (confirmado: boolean): CargaCliente => ({
  rutaDetalleId: Math.random(),
  codigoCliente: "C1",
  nombreCliente: "Cliente",
  noFactura: "FT-1",
  noPedidoStr: "P-1",
  secuenciaEntrega: 1,
  totalBultos: 1,
  confirmado,
  conIncidencia: false,
  productos: [],
});

describe("cargaHabilitada", () => {
  it("unlocks loading once the invoices are assigned to the driver", () => {
    expect(cargaHabilitada({ facturasGeneradas: true, facturasAsignadas: true })).toBe(true);
  });

  it("keeps loading locked while the invoices are not assigned", () => {
    expect(cargaHabilitada({ facturasGeneradas: false, facturasAsignadas: false })).toBe(false);
    expect(cargaHabilitada({ facturasGeneradas: true, facturasAsignadas: false })).toBe(false);
  });

  it("allows loading when an older backend sends no flag", () => {
    expect(cargaHabilitada({})).toBe(true);
  });

  it("is false without data", () => {
    expect(cargaHabilitada(null)).toBe(false);
    expect(cargaHabilitada(undefined)).toBe(false);
  });
});

describe("estadoFacturacion", () => {
  it("distinguishes waiting, generated and assigned", () => {
    expect(estadoFacturacion({ facturasGeneradas: false, facturasAsignadas: false })).toBe("esperando");
    expect(estadoFacturacion({ facturasGeneradas: true, facturasAsignadas: false })).toBe("generadas");
    expect(estadoFacturacion({ facturasGeneradas: true, facturasAsignadas: true })).toBe("asignadas");
  });

  it("treats a missing flag (older backend) as assigned", () => {
    expect(estadoFacturacion({})).toBe("asignadas");
  });
});

describe("isEsperandoFacturacion", () => {
  it("matches the 409 ESPERANDO_FACTURACION response", () => {
    expect(
      isEsperandoFacturacion({
        response: { status: 409, data: { message: "La ruta está esperando facturación", code: "ESPERANDO_FACTURACION" } },
      })
    ).toBe(true);
  });

  it("ignores other conflicts and errors", () => {
    expect(isEsperandoFacturacion({ response: { status: 409, data: { code: "OTRO" } } })).toBe(false);
    expect(isEsperandoFacturacion({ response: { status: 400, data: { code: "ESPERANDO_FACTURACION" } } })).toBe(false);
    expect(isEsperandoFacturacion(new Error("Network Error"))).toBe(false);
    expect(isEsperandoFacturacion(null)).toBe(false);
    expect(isEsperandoFacturacion(undefined)).toBe(false);
  });
});

describe("resumenCarga", () => {
  const assigned = { facturasGeneradas: true, facturasAsignadas: true };

  it("reports the invoicing phase before release", () => {
    expect(resumenCarga({ facturasGeneradas: false, facturasAsignadas: false, clientes: [cliente(false)] }).fase).toBe("esperando");
    expect(resumenCarga({ facturasGeneradas: true, facturasAsignadas: false, clientes: [cliente(false)] }).fase).toBe("generadas");
  });

  it("reports assigned with nothing loaded yet", () => {
    expect(resumenCarga({ ...assigned, clientes: [cliente(false), cliente(false)] })).toEqual({
      fase: "asignadas",
      cargados: 0,
      total: 2,
    });
  });

  it("reports partial loading with counts", () => {
    expect(resumenCarga({ ...assigned, clientes: [cliente(true), cliente(false), cliente(false)] })).toEqual({
      fase: "cargando",
      cargados: 1,
      total: 3,
    });
  });

  it("reports a complete load", () => {
    expect(resumenCarga({ ...assigned, clientes: [cliente(true), cliente(true)] }).fase).toBe("completa");
  });

  it("tolerates a missing client list", () => {
    expect(resumenCarga({ ...assigned, clientes: undefined as unknown as CargaCliente[] })).toEqual({
      fase: "asignadas",
      cargados: 0,
      total: 0,
    });
  });
});

describe("preparacionAbierta", () => {
  it("allows picking while the route is confirmada or en_preparacion", () => {
    expect(preparacionAbierta("confirmada")).toBe(true);
    expect(preparacionAbierta("en_preparacion")).toBe(true);
  });

  it("locks picking once the route moved past preparation", () => {
    expect(preparacionAbierta("lista_despacho")).toBe(false);
    expect(preparacionAbierta("en_ruta")).toBe(false);
    expect(preparacionAbierta("completada")).toBe(false);
    expect(preparacionAbierta("cancelada")).toBe(false);
    expect(preparacionAbierta("borrador")).toBe(false);
  });

  it("keeps the editable behaviour when an older backend sends no status", () => {
    expect(preparacionAbierta(undefined)).toBe(true);
    expect(preparacionAbierta(null)).toBe(true);
  });
});

describe("preparacionCompletada", () => {
  it("is true only for routes that went through preparation", () => {
    expect(preparacionCompletada("lista_despacho")).toBe(true);
    expect(preparacionCompletada("en_ruta")).toBe(true);
    expect(preparacionCompletada("completada")).toBe(true);
    expect(preparacionCompletada("cancelada")).toBe(false);
    expect(preparacionCompletada("en_preparacion")).toBe(false);
    expect(preparacionCompletada(undefined)).toBe(false);
  });
});

describe("esPreparacionCerrada", () => {
  it("matches the 409 PREPARACION_CERRADA response", () => {
    expect(
      esPreparacionCerrada({
        response: { status: 409, data: { message: "La ruta ya fue preparada", code: "PREPARACION_CERRADA" } },
      })
    ).toBe(true);
  });

  it("ignores other conflicts and errors", () => {
    expect(esPreparacionCerrada({ response: { status: 409, data: { code: "ESPERANDO_FACTURACION" } } })).toBe(false);
    expect(esPreparacionCerrada({ response: { status: 400, data: { code: "PREPARACION_CERRADA" } } })).toBe(false);
    expect(esPreparacionCerrada(new Error("Network Error"))).toBe(false);
    expect(esPreparacionCerrada(null)).toBe(false);
  });
});
